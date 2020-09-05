import * as React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MonriAndroidIos from 'react-native-monri-android-ios';

export default function App() {
  const [result, setResult] = React.useState<string | undefined>();

  React.useEffect(() => {
    fetch('https://mobile.webteh.hr/example/create-payment-session', {
  method: 'POST',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({    })
}).then(v => v.json()).then(json => {
  return MonriAndroidIos.confirmPayment({
    authenticityToken: '6a13d79bde8da9320e88923cb3472fb638619ccb',
    developmentMode: true
  }, {
    clientSecret: json['client_secret'] as string,
    card: {
      pan: "4341 7920 0000 0044",
      cvv: "123",
      expiryMonth: 12,
      expiryYear: 2020
    },
    transaction: {
      email: 'jasmin.suljich@gmail.com',
      orderInfo: 'React native bridge???',
      phone: '061123213',
      city: 'Sarajevo',
      country: 'BA',
      address: 'Laticka',
      fullName: 'Jasmin Suljic',
      zip: '71210'
    }
  })
}).then(r => `${r.status}, amount = ${r.amount}, created_at = ${r.createdAt}, order_number = ${r.orderNumber}`).then(setResult).catch(e => {
  setResult(e)
})
    
    
  }, []);

  return (
    <View style={styles.container}>
      <Text>Result: {result}</Text>
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
