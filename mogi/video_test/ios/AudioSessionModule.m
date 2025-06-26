#import <React/RCTBridgeModule.h>

// "AudioSessionModule"이라는 이름의 네이티브 모듈을 외부로 노출시킵니다.
@interface RCT_EXTERN_MODULE(AudioSessionModule, NSObject)

// AudioSessionModule.swift 파일에 있는 activateAudioSession 함수를
// JavaScript에서 Promise(async/await) 형태로 호출할 수 있도록 등록합니다.
RCT_EXTERN_METHOD(activateAudioSession:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
