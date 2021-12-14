import * as React from 'react';
import { StyleSheet, View, Text, Button } from 'react-native';
import MonriAndroidIos from 'react-native-monri-android-ios';

export default function App() {
  const [result, setResult] = React.useState<string | undefined>();

  function onPressLearnMore() {
    fetch('https://mobile.webteh.hr/example/create-payment-session', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })
      .then((v) => v.json())
      .then((json) => {
        // return MonriAndroidIos.multiply(1, 2);
        return MonriAndroidIos.confirmPayment(
          {
            authenticityToken: '6a13d79bde8da9320e88923cb3472fb638619ccb',
            developmentMode: true,
          },
          {
            clientSecret: json.client_secret as string,
            card: {
              pan: '4341 7920 0000 0044',
              cvv: '123',
              expiryMonth: 12,
              expiryYear: 2032,
              saveCard: true
            },
            transaction: {
              email: 'monri.react.native@gmail.com',
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
