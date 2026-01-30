import * as React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Platform,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import MonriAndroidIos from 'react-native-monri-android-ios';
import sha512 from 'crypto-js/sha512';
import VisionCameraView from './components/VisionCameraView';
import { useScanDoc } from '../../src/hooks/useScanDoc';
import {
  validateCreditCardImage,
  type CreditCardExtractionRequest,
  type ScandocAuthRequest,
  type ValidationRequest,
  type ValidationResponse,
} from '../../src/api';

const cleanBase64 = (input: string) =>
  input
    .replace(/^data:image\/[a-zA-Z+]+;base64,/, '')
    .replace(/\s/g, '')
    .trim();

type Mode = 'validation' | 'extraction';

export default function App() {
  const [result, setResult] = React.useState<string | undefined>();
  const [showCamera, setShowCamera] = React.useState(false);
  const [mode, setMode] = React.useState<Mode>('validation');
  const [lastPhoto, setLastPhoto] = React.useState<{ uri: string } | null>(
    null
  );
  const [lastValidation, setLastValidation] =
    React.useState<ValidationResponse | null>(null);
  const validationStreakRef = React.useRef(0);

  const { extract, isLoading, error, data } = useScanDoc();

  const scandocUserKey = 'XCbnR54PAHma8hyBiP7J93xgzAHzAI';
  const scandocSubClient = 'react-native-monri-android-ios';

  const key = 'your_key_here';
  const authenticityToken = 'your_authenticity_token_here';
  const applePayMerchantID = 'your_apple_pay_merchant_id_here';

  const createPaymentSession = React.useCallback(async () => {
    const transactionData = {
      amount: 100,
      order_number: `rn-example-${new Date().getTime()}`,
      currency: 'EUR',
      transaction_type: 'purchase',
      order_info: 'Create payment session order info',
      scenario: 'charge',
    };

    const bodyAsString = JSON.stringify(transactionData);
    const timestamp = Math.floor(Date.now() / 1000);
    const digest = sha512(
      key + timestamp + authenticityToken + bodyAsString
    ).toString();
    const authorization = `WP3-v2 ${authenticityToken} ${timestamp} ${digest}`;

    const response = await fetch('https://ipgtest.monri.com/v2/payment/new', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': bodyAsString.length.toString(),
        'Authorization': authorization,
      },
      body: bodyAsString,
    });

    try {
      const json = await response.json();
      if (!json.client_secret) {
        throw new Error('Server response missing client_secret.');
      }
      return json.client_secret as string;
    } catch {
      throw new Error('Server returned non-JSON response.');
    }
  }, [authenticityToken, key]);

  async function payWithGooglePay() {
    try {
      if (Platform.OS !== 'android') {
        throw new Error('Google Pay is only available on Android devices.');
      }
      const clientSecret = await createPaymentSession();
      const response = await MonriAndroidIos.confirmPayment(
        {
          authenticityToken,
          developmentMode: true,
        },
        {
          type: 'googlePay',
          googlePayButtonOptions: {
            type: 1,
            theme: 1,
            borderRadius: 8,
          },
          clientSecret,
          transaction: {
            fullName: 'React Native',
            address: 'Laticka',
            city: 'Sarajevo',
            zip: '71210',
            phone: '061123213',
            country: 'BA',
            email: 'react.native@monri.com',
            orderInfo: 'Monri React Native Google Pay Test',
          },
        }
      );
      setResult(JSON.stringify(response));
    } catch (error) {
      setResult(String(error));
    }
  }

  async function payWithApplePay() {
    try {
      if (Platform.OS !== 'ios') {
        throw new Error('Apple Pay is only available on iOS devices.');
      }
      const clientSecret = await createPaymentSession();
      const response = await MonriAndroidIos.confirmPayment(
        {
          authenticityToken,
          developmentMode: true,
          merchantID: applePayMerchantID,
        },
        {
          type: 'applePay',
          clientSecret,
          pkPaymentButtonType: 2,
          pkPaymentButtonStyle: 2,
          transaction: {
            fullName: 'React Native',
            address: 'Laticka',
            city: 'Sarajevo',
            zip: '71210',
            phone: '061123213',
            country: 'BA',
            email: 'react.native@monri.com',
            orderInfo: 'Monri React Native Apple Pay Test',
          },
        }
      );
      setResult(JSON.stringify(response));
    } catch (error) {
      setResult(String(error));
    }
  }

  async function onPressLearnMore() {
    try {
      const clientSecret = await createPaymentSession();
      const response = await MonriAndroidIos.confirmPayment(
        {
          authenticityToken,
          developmentMode: true,
        },
        {
          type: 'card',
          clientSecret,
          card: {
            pan: '4341 7920 0000 0044',
            cvv: '123',
            expiryMonth: 12,
            expiryYear: 2027,
            saveCard: false,
          },
          transaction: {
            email: 'react.native@monri.com',
            orderInfo: 'Monri React Native Plugin Example App',
            phone: '061123213',
            city: 'Sarajevo',
            country: 'BA',
            address: 'Laticka',
            fullName: 'React Native',
            zip: '71210',
          },
        }
      );
      setResult(JSON.stringify(response));
    } catch (error) {
      setResult(String(error));
    }
  }

  const [validationMessage, setValidationMessage] = React.useState<string>('');
  const [validationError, setValidationError] = React.useState<string | null>(
    null
  );

  if (showCamera) {
    return (
      <VisionCameraView
        step="front"
        onClose={() => setShowCamera(false)}
        onCapture={async (payload) => {
          setLastPhoto({ uri: payload.uri });

          const cleanedImage = cleanBase64(payload.base64);

          if (mode === 'validation') {
            const validationPayload: ValidationRequest = {
              AcceptTermsAndConditions: true,
              Settings: {
                SkipImageSizeCheck: true,
              },
              DataFields: {
                Image: cleanedImage,
                ImageType: 'base64',
                ImageCropped: false,
              },
            };

            try {
              const validationResult = await validateCreditCardImage(
                validationPayload
              );
              setLastValidation(validationResult);
              setValidationError(null);

              if (validationResult.Validated) {
                validationStreakRef.current += 1;
              } else {
                validationStreakRef.current = 0;
              }

              if (validationResult.Errors?.length) {
                setValidationError(validationResult.Errors.join(', '));
              }

              if (validationStreakRef.current < 3) {
                setValidationMessage(
                  `Validation ${
                    validationResult.Validated ? 'passed' : 'failed'
                  } (${validationStreakRef.current}/3). Capture again.`
                );
                return;
              }

              setValidationMessage(
                'Validation passed 3 times. Ready for extraction.'
              );
              setResult('Validation passed 3 times. Ready for extraction.');
              setShowCamera(false);
              validationStreakRef.current = 0;
            } catch (e) {
              setValidationError(String(e));
              setValidationMessage('Validation error.');
            }

            return;
          }

          const scanPayload: CreditCardExtractionRequest = {
            DataFields: {
              Image: cleanedImage,
              ImageType: 'base64',
              ImageCropped: false,
            },
            Settings: {
              ShouldReturnDocumentImage: false,
              SkipDocumentSizeCheck: true,
              SkipImageSizeCheck: true,
              CanStoreImages: false,
              DontUseValidation: false,
            },
            AcceptTermsAndConditions: true,
          };

          const authCreds: ScandocAuthRequest = {
            user_key: scandocUserKey,
            sub_client: scandocSubClient,
          };

          try {
            const scanResult = await extract(scanPayload, authCreds);
            setResult(`Scan success: ${JSON.stringify(scanResult)}`);
          } catch (e) {
            setResult(`Scan error: ${String(e)}`);
          } finally {
            setShowCamera(false);
          }
        }}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView>
        <View style={styles.container}>
          <Text style={{ textAlign: 'center', marginTop: 12 }}>
            Result: {result}
          </Text>
          <Text style={{ marginBottom: 12 }}>Validation</Text>

          {lastValidation && (
            <View style={styles.validationStatus}>
              <View
                style={[
                  styles.validationDot,
                  {
                    backgroundColor: lastValidation.Validated
                      ? '#2ecc71'
                      : '#e74c3c',
                  },
                ]}
              />
              <Text>
                {lastValidation.Validated ? 'Validated' : 'Not validated'}{' '}
                (streak {validationStreakRef.current}/3)
              </Text>
            </View>
          )}

          {!!validationMessage && (
            <Text style={{ marginBottom: 8 }}>{validationMessage}</Text>
          )}

          {!!validationError && (
            <Text style={{ color: 'red', marginBottom: 12 }}>
              Validation error: {validationError}
            </Text>
          )}

          <TouchableOpacity
            onPress={() => {
              setMode('validation');
              setShowCamera(true);
            }}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Open Validation Camera</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.container}>
          <Text style={{ marginBottom: 12 }}>Extraction</Text>

          {!!lastPhoto && (
            <Image
              source={{ uri: lastPhoto.uri }}
              style={{ width: 160, height: 160, marginBottom: 16 }}
            />
          )}

          {isLoading && <ActivityIndicator style={{ marginBottom: 12 }} />}

          {error && (
            <Text style={{ color: 'red', marginBottom: 12 }}>
              Scan error: {error.message}
            </Text>
          )}

          {data && (
            <Text style={{ marginBottom: 12 }}>
              Scan data: {JSON.stringify(data)}
            </Text>
          )}

          <TouchableOpacity
            onPress={() => {
              setMode('extraction');
              setShowCamera(true);
            }}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Open Extraction Camera</Text>
          </TouchableOpacity>
        </View>

        <View style={{ padding: 16 }}>
          <TouchableOpacity
            onPress={Platform.OS === 'ios' ? payWithApplePay : payWithGooglePay}
            style={styles.payButton}
          >
            <Text style={styles.payButtonText}>
              {Platform.OS === 'ios'
                ? 'Pay with Apple Pay'
                : 'Pay with Google Pay'}
            </Text>
          </TouchableOpacity>
          <View style={{ height: 20 }} />
          <TouchableOpacity onPress={onPressLearnMore} style={styles.payButton}>
            <Text style={styles.payButtonText}>Pay with Card</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingTop: Platform.OS === 'android' ? 0 : 64,
  },
  primaryButton: {
    backgroundColor: '#1b7cff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 16,
  },
  primaryButtonText: { color: '#ffffff', fontSize: 18 },
  payButton: {
    backgroundColor: '#841584',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  payButtonText: { color: '#ffffff', fontSize: 18 },
  validationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  validationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
});
