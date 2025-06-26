import Foundation
import AVFoundation

// React Native에서 이 클래스를 'AudioSessionModule'이라는 이름으로 인식하도록 설정합니다.
@objc(AudioSessionModule)
class AudioSessionModule: NSObject {

  // 이 함수를 JavaScript에서 호출할 수 있도록 외부에 노출시킵니다.
  // async/await를 사용하기 위해 Promise 형태로 만듭니다.
  @objc
  func activateAudioSession(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    
    print("iOS 네이티브: 녹음을 위해 오디오 세션을 활성화합니다...")
    let audioSession = AVAudioSession.sharedInstance()
    
    do {
      // 오디오 세션 카테고리를 '재생 및 녹음'으로 설정합니다.
      // 이것이 재생과 녹음을 동시에 가능하게 하는 핵심 설정입니다.
      try audioSession.setCategory(.playAndRecord, mode: .videoRecording, options: [.mixWithOthers, .defaultToSpeaker])
      
      // 설정한 세션을 활성화합니다.
      try audioSession.setActive(true)
      
      print("✅ iOS 네이티브: 오디오 세션 활성화 성공.")
      // JavaScript의 await 구문에 true 값을 반환하며 성공을 알립니다.
      resolve(true)
      
    } catch {
      print("❌ iOS 네이티브: 오디오 세션 활성화 실패: \(error.localizedDescription)")
      // JavaScript의 catch 구문으로 에러 정보를 전달하며 실패를 알립니다.
      reject("AUDIO_SESSION_ERROR", error.localizedDescription, error)
    }
  }

  // 이 모듈이 메인 스레드에서 설정되어야 한다고 React Native에 알려줍니다. (필수)
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
