# react-native-monri-android-ios

React Native bridge for Monri Android/iOS SDK

## Installation

```sh
npm install react-native-monri-android-ios
```

## Usage

```js
import MonriAndroidIos from "react-native-monri-android-ios";

// ...

const result = await MonriAndroidIos.confirmPayment({
    authenticityToken: '6a13d79bde8da9320e88923cb3472fb638619ccb',
    developmentMode: true,
  },
  {
    clientSecret: "client_secret", // create one on your backend
    card: {
      pan: '4341 7920 0000 0044',
      cvv: '123',
      expiryMonth: 12,
      expiryYear: 2032,
      saveCard: true
    },
    transaction: {
      email: 'test-react-native@monri.com',
      orderInfo: 'React native bridge???',
      phone: '061123213',
      city: 'Sarajevo',
      country: 'BA',
      address: 'Radnicka',
      fullName: 'Test Test',
      zip: '71210',
    },
  });
```

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT
