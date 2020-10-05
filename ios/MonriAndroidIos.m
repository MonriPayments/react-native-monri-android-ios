#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(MonriAndroidIos, NSObject)

RCT_EXTERN_METHOD(confirmPayment:(NSDictionary*)monriApiOptions withParams:(NSDictionary*)params
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

@end
