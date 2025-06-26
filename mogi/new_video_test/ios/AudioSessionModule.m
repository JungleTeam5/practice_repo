// AudioSessionModule.m

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(AudioSessionModule, NSObject)

RCT_EXTERN_METHOD(activateAudioSession:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// --- [추가] 새로운 함수를 브릿지에 노출시킵니다 ---
RCT_EXTERN_METHOD(deactivateAudioSession)

@end
