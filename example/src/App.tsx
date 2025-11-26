import * as React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Platform,
  TouchableOpacity,
} from 'react-native';
import MonriAndroidIos from 'react-native-monri-android-ios';
import sha512 from 'crypto-js/sha512';

export default function App() {
  const [result, setResult] = React.useState<string | undefined>();

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

  return (
    <View style={styles.container}>
      <Text style={{ color: Platform.OS === 'ios' ? '#ffffff' : '#000000' }}>
        Result: {result}
      </Text>

      <TouchableOpacity
        onPress={Platform.OS === 'ios' ? payWithApplePay : payWithGooglePay}
        style={{
          backgroundColor: '#841584',
          paddingVertical: 12,
          paddingHorizontal: 24,
          borderRadius: 8,
        }}
      >
        <Text style={{ color: '#ffffff', fontSize: 18 }}>
          {Platform.OS === 'ios' ? 'Pay with Apple Pay' : 'Pay with Google Pay'}
        </Text>
      </TouchableOpacity>
      <View style={{ height: 20 }} />
      <TouchableOpacity
        onPress={onPressLearnMore}
        style={{
          backgroundColor: '#841584',
          paddingVertical: 12,
          paddingHorizontal: 24,
          borderRadius: 8,
        }}
      >
        <Text style={{ color: '#ffffff', fontSize: 18 }}>Pay with Card</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
