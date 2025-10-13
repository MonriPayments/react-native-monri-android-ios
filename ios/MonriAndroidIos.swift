import Monri

import PassKit

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
        var resolveOnce = resolve
        var rejectOnce = reject
        var settled = false
        let lock = NSLock()

        func settle(_ block: () -> Void) {
            lock.lock(); guard !settled else { lock.unlock(); return }
            settled = true; lock.unlock(); block()
            resolveOnce = nil; rejectOnce = nil
        }

        do {
            let paramsDict = params as! [String: Any]
            let options = try parseMonriApiOptions(monriApiOptions as! [String: Any])
            let confirmPaymentParams = try parseConfirmPaymentParams(paramsDict)
            let applePayCustomisation = getApplePayCustomisation(paramsDict)

            let delegate = UIApplication.shared.delegate!
            let vc = delegate.window!!.rootViewController!


            writeMetaData()

            let monri = MonriApi(vc, options: options)
            monri.confirmPayment(confirmPaymentParams, applePayCustomisation: applePayCustomisation) { [weak self] result in
                guard self != nil else { return }

                DispatchQueue.main.async {

                    switch result {
                    case .result(let paymentResult) where paymentResult.status.lowercased() == "pending":
                        return
                    case .result(let paymentResult):
                        var rv: [String: Any] = [
                            "status": paymentResult.status,
                            "currency": paymentResult.currency,
                            "amount": paymentResult.amount,
                            "orderNumber": paymentResult.orderNumber,
                            "createdAt": paymentResult.createdAt,
                            "transactionType": paymentResult.transactionType,
                        ]

                        if let pm = paymentResult.paymentMethod,
                           let data = pm.data as? [String: Any] {
                            rv["paymentMethod"] = [
                                "type": pm.type,
                                "data": [
                                    "brand": data["brand"] ?? "",
                                    "expirationDate": data["expiration_date"] ?? "",
                                    "issuer": data["issuer"] ?? "",
                                    "masked": data["masked"] ?? "",
                                    "token": data["token"] ?? ""
                                ]
                            ]
                        }

                        if let panToken = paymentResult.panToken {
                            rv["panToken"] = panToken
                        }

                        rv["errors"] = paymentResult.errors

                        settle { resolveOnce?(rv) }
                    case .error(let e):
                        settle { rejectOnce?("confirm_payment_error", e.localizedDescription, nil) }
                    case .declined(let d):
                        settle { resolveOnce?(["status": d.status]) }
                    case .pending:
                    }
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
        let merchantID = params["merchantID"] as? String ?? params["merchantId"]

        return MonriApiOptions(authenticityToken: authenticityToken, developmentMode: developmentMode, merchantID: merchantID)
    }

    private func parseConfirmPaymentParams(_ params: [String: Any]) throws -> ConfirmPaymentParams {
        let clientSecret = try requiredStringAttribute(params, "clientSecret")
        guard let transactionParams = params["transaction"] as? [String: Any] else {
            throw MonriAndroidIosConfirmPaymentError.missingRequiredAttribute("transaction")
        }

        let type = params["type"] as? String ?? "card"
        let paymentMethod: PaymentMethodParams

        switch type {
        case "card":
            guard let cardParams = params["card"] as? [String: Any] else {
                throw MonriAndroidIosConfirmPaymentError.missingRequiredAttribute("params.card")
            }
            paymentMethod = Card(
                number: try requiredStringAttribute(cardParams, "pan", "params.card.pan"),
                cvc: try requiredStringAttribute(cardParams, "cvv", "params.card.cvv"),
                expMonth: try requiredIntAttribute(cardParams, "expiryMonth", "params.card.expiryMonth"),
                expYear: try requiredIntAttribute(cardParams, "expiryYear", "params.card.expiryYear"),
                tokenizePan: (cardParams["saveCard"] as? Bool) ?? false
            ).toPaymentMethodParams()
        case "savedCard":
            guard let savedCardParams = params["savedCard"] as? [String: Any] else {
                throw MonriAndroidIosConfirmPaymentError.missingRequiredAttribute("params.savedCard")
            }
            paymentMethod = SavedCard(
                panToken: try requiredStringAttribute(savedCardParams, "panToken", "params.savedCard.panToken"),
                cvc: try requiredStringAttribute(savedCardParams, "cvv", "params.savedCard.cvv")
            ).toPaymentMethodParams()
        case "applePay":
            paymentMethod = ApplePayPayment(paymentProvider: .APPLE_PAY).toPaymentMethodParams()
        default:
            throw MonriAndroidIosConfirmPaymentError.configurationError("Got unsupported type \(type), expected one of = card, savedCard, applePay")
        }

        let customerParams = CustomerParams(
            email: getString(transactionParams, "email"),
            fullName: getString(transactionParams, "fullName"),
            address: getString(transactionParams, "address"),
            city: getString(transactionParams, "city"),
            zip: getString(transactionParams, "zip"),
            phone: getString(transactionParams, "phone"),
            country: getString(transactionParams, "country")
        )

        let transaction = TransactionParams.create()
            .set(customerParams: customerParams)
            .set("order_info", transactionParams["orderInfo"] as? String)

        return ConfirmPaymentParams(paymentId: clientSecret, paymentMethod: paymentMethod, transaction: transaction)
    }

    private func writeMetaData() {
        let version: String = "0.3.3"

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

    private func prettyJSONString(_ object: Any) -> String {
        if JSONSerialization.isValidJSONObject(object),
           let data = try? JSONSerialization.data(withJSONObject: object, options: [.prettyPrinted, .sortedKeys]),
           let string = String(data: data, encoding: .utf8) {
            return string
        }
        return String(describing: object)
    }

    private func getApplePayCustomisation(_ params: [String: Any]) -> (PKPaymentButtonType, PKPaymentButtonStyle)? {
        guard
            let typeValue = params["pkPaymentButtonType"],
            !(typeValue is NSNull),
            let styleValue = params["pkPaymentButtonStyle"],
            !(styleValue is NSNull),
            let typeNumber = typeValue as? NSNumber,
            let styleNumber = styleValue as? NSNumber,
            let type = PKPaymentButtonType(rawValue: typeNumber.intValue),
            let style = PKPaymentButtonStyle(rawValue: styleNumber.intValue)
        else {
            return nil
        }

        return (type, style)
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
