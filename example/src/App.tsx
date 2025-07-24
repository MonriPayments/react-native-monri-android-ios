import * as React from 'react';
import { StyleSheet, View, Text, Button } from 'react-native';
import MonriAndroidIos from 'react-native-monri-android-ios';
import sha512 from 'crypto-js/sha512';

export default function App() {
  const [result, setResult] = React.useState<string | undefined>();

  function onPressLearnMore() {
    const key = 'your-merchant-key';
    const authenticityToken = 'your-authenticity-token';

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
    const digest = sha512(key + timestamp + authenticityToken + bodyAsString).toString();
    const authorization = `WP3-v2 ${authenticityToken} ${timestamp} ${digest}`;

    fetch('https://ipgtest.monri.com/v2/payment/new', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': bodyAsString.length.toString(),
        'Authorization': authorization,
      },
      body: bodyAsString,
    })
      .then((response) => {
        // Clone the response so we can read it twice
        const clonedResponse = response.clone();
        return response.json().catch(() => {
          // If .json() fails, read the response as text
          return clonedResponse.text().then((text) => {
            console.error('Server response was not valid JSON:', text);
            throw new Error(`Server returned non-JSON response. Check console for details.`);
          });
        });
      })
      .then((json) => {
        // return MonriAndroidIos.multiply(1, 2);
        return MonriAndroidIos.confirmPayment(
          {
            authenticityToken: authenticityToken,
            developmentMode: true,
          },
          {
            clientSecret: json.client_secret as string,
            card: {
              pan: '4341 7920 0000 0044',
              cvv: '123',
              expiryMonth: 12,
              expiryYear: 2027,
              saveCard: false
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
      })
      .then(
        (r) =>
          `${JSON.stringify(r)}`
      )
      .then(setResult)
      .catch((e) => {
        setResult(`${e}`);
      });
  }

  return (
    <View style={styles.container}>

      <Text>Result: {result}</Text>

      <Button
        onPress={onPressLearnMore}
        title="Start payment"
        color="#841584"
        accessibilityLabel="Learn more about this purple button"
      />
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
