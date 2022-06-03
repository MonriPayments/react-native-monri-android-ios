import Monri

@objc(MonriAndroidIos)
class MonriAndroidIos: NSObject {

    @objc static func requiresMainQueueSetup() -> Bool {
        return true
    }

    @objc(confirmPayment:withParams:withResolver:withRejecter:)
    func confirmPayment(monriApiOptions: NSDictionary, params: NSDictionary, resolve: RCTPromiseResolveBlock?, reject: RCTPromiseRejectBlock?) -> Void {

        DispatchQueue.main.async { [weak self] in
            guard let module = self else {
                return
            }

            module.__call(monriApiOptions: monriApiOptions, params: params, resolve: resolve, reject: reject)
        }
    }

    private func __call(monriApiOptions: NSDictionary, params: NSDictionary, resolve: RCTPromiseResolveBlock?, reject: RCTPromiseRejectBlock?) {
        do {
            let options = try parseMonriApiOptions(monriApiOptions as! [String: Any])
            let confirmPaymentParams = try parseConfirmPaymentParams(params as! [String: Any])
            let delegate = UIApplication.shared.delegate!
            let vc = delegate.window!!.rootViewController!

            writeMetaData()

            let monri = MonriApi(vc, options: options)
            monri.confirmPayment(confirmPaymentParams) { [weak self] result in

                guard let _ = self else {
                    return
                }

                guard let resolve = resolve else {
                    return
                }

                switch (result) {
                case .result(let paymentResult):
                    var rv: [String: Any] = [
                        "status": paymentResult.status,
                        "currency": paymentResult.currency,
                        "clientSecret": paymentResult.currency,
                        "amount": paymentResult.amount,
                        "orderNumber": paymentResult.orderNumber,
                        "createdAt": paymentResult.createdAt,
                        "transactionType": paymentResult.transactionType,
                    ]

                    if let pm = paymentResult.paymentMethod {
                        rv["paymentMethod"] = [
                            "type": pm.type,
                            "data": [
                                "brand": pm.data["brand"]!,
                                "expirationDate": pm.data["expiration_date"]!,
                                "issuer": pm.data["issuer"]!,
                                "masked": pm.data["masked"]!,
                                "token": pm.data["token"]!
                            ]
                        ]
                    }

                    if let panToken = paymentResult.panToken {
                        rv["panToken"] = panToken
                    }

                    rv["errors"] = paymentResult.errors

                    resolve(rv)
                case .error(let e):
                    resolve(["status": "error", "errors": [e.localizedDescription]])
                case .declined(let d):
                    resolve(["status": d.status])
                case .pending:
                    resolve(["status": "pending"])
                }
            }
        } catch {
            //                NSString *code, NSString *message, NSError *error
            if let configurationError = error as? MonriAndroidIosConfirmPaymentError {
                switch (configurationError) {
                case .configurationError(let m):
                    reject?(MonriAndroidIosConfirmPaymentErrorCodes.configurationError.rawValue, m, error)
                case .parsingError(let m):
                    reject?(MonriAndroidIosConfirmPaymentErrorCodes.parsingError.rawValue, m, error)
                case .failedToParseMonriApiOptions:
                    reject?(MonriAndroidIosConfirmPaymentErrorCodes.failedToParseMonriApiOptions.rawValue, "Failed to parse api options", error)
                case .missingRequiredAttribute(let m):
                    reject?(MonriAndroidIosConfirmPaymentErrorCodes.missingRequiredAttribute.rawValue, m, error)
                }

            } else {
                reject?(MonriAndroidIosConfirmPaymentErrorCodes.unknown.rawValue, error.localizedDescription, error)
            }
        }
    }

    private func parseMonriApiOptions(_ params: [String: Any]) throws -> MonriApiOptions {
        let authenticityToken = try requiredStringAttribute(params, "authenticityToken")
        let developmentMode = params["developmentMode"] as? Bool ?? false

        return MonriApiOptions(authenticityToken: authenticityToken, developmentMode: developmentMode)
    }

    private func parseConfirmPaymentParams(_ params: [String: Any]) throws -> ConfirmPaymentParams {
        let clientSecret = try requiredStringAttribute(params, "clientSecret")
        guard let transactionParams = params["transaction"] as? [String: Any] else {
            throw MonriAndroidIosConfirmPaymentError.missingRequiredAttribute("transaction")
        }

        var type = "card"

        var cardParams: [String: Any]? = params[type] as? [String: Any]

        if (cardParams == nil) {
            type = "savedCard"
            cardParams = params[type] as? [String: Any]
        }

        guard let card = cardParams else {
            throw MonriAndroidIosConfirmPaymentError.parsingError("Missing card or savedCard in params")
        }

        var paymentMethod: PaymentMethodParams

        if (type == "card") {
            paymentMethod = Card(
                    number: try requiredStringAttribute(card, "pan", "params.card.pan"),
                    cvc: try requiredStringAttribute(card, "cvv", "params.card.cvv"),
                    expMonth: try requiredIntAttribute(card, "expiryMonth", "params.card.expiryMonth"),
                    expYear: try requiredIntAttribute(card, "expiryYear", "params.card.expiryYear"),
                    tokenizePan: (card["saveCard"] as? Bool) ?? false
                    ).toPaymentMethodParams()
        } else if (type == "savedCard") {
            paymentMethod = SavedCard(
                    panToken: try requiredStringAttribute(card, "panToken", "params.savedCard.panToken"),
                    cvc: try requiredStringAttribute(card, "cvv", "params.savedCard.cvv"))
                    .toPaymentMethodParams()
        } else {
            throw MonriAndroidIosConfirmPaymentError.configurationError("Got unsupported type \(type), expected one of = card, savedCard")
        }

        let customerParams = CustomerParams(email: getString(transactionParams, "email"),
                fullName: getString(transactionParams, "fullName"),
                address: getString(transactionParams, "address"),
                city: getString(transactionParams, "city"),
                zip: getString(transactionParams, "zip"),
                phone: getString(transactionParams, "phone"),
                country: getString(transactionParams, "country")
        )

        return ConfirmPaymentParams(paymentId: clientSecret, paymentMethod: paymentMethod, transaction: TransactionParams.create()
                .set(customerParams: customerParams)
                .set("order_info", transactionParams["orderInfo"] as? String)
        )

    }

    private func writeMetaData(){
            let version: String = "0.3.0"

            let defaults = UserDefaults.standard
            defaults.set("iOS-SDK:ReactNative:\(version)", forKey: "com.monri.meta.library")
        }

    private func getString(_ params: [String: Any], _ key: String) -> String? {
        return params[key] as? String
    }

    private func requiredStringAttribute(_ params: [String: Any], _ key: String, _ path: String? = nil) throws -> String {
        guard let value = params[key] as? String else {
            throw MonriAndroidIosConfirmPaymentError.missingRequiredAttribute(path ?? key)
        }

        return value
    }

    private func requiredIntAttribute(_ params: [String: Any], _ key: String, _ path: String? = nil) throws -> Int {
        guard let value = params[key] as? Int else {
            throw MonriAndroidIosConfirmPaymentError.missingRequiredAttribute(path ?? key)
        }

        return value
    }

    enum MonriAndroidIosConfirmPaymentErrorCodes: String {
        case failedToParseMonriApiOptions
        case configurationError
        case parsingError
        case missingRequiredAttribute
        case unknown
    }

    enum MonriAndroidIosConfirmPaymentError: Error {
        case failedToParseMonriApiOptions
        case configurationError(String)
        case parsingError(String)
        case missingRequiredAttribute(String)
    }
}
