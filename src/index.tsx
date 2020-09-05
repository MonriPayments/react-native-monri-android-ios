import { NativeModules } from 'react-native';

type MonriAndroidIosType = {
  multiply(a: number, b: number): Promise<number>;
};

const { MonriAndroidIos } = NativeModules;

export default MonriAndroidIos as MonriAndroidIosType;
