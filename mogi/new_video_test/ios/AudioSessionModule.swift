// AudioSessionModule.swift (수정)
import Foundation
import AVFoundation

@objc(AudioSessionModule)
class AudioSessionModule: NSObject {

  @objc
  func activateAudioSession(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let audioSession = AVAudioSession.sharedInstance()
    do {
      // 이미 AppDelegate에서 올바르게 설정되었을 것이므로 setCategory 호출 제거
      // try audioSession.setCategory(.playAndRecord, mode: .videoRecording, options: [.mixWithOthers, .defaultToSpeaker, .allowBluetooth, .allowAirPlay])
      try audioSession.setActive(true) // 단순히 활성화만 수행
      print("Swift: 오디오 세션 활성화 성공.")
      resolve("Audio session activated.")
    } catch {
      print("Swift: 오디오 세션 활성화 실패: \(error.localizedDescription)")
      reject("AUDIO_SESSION_ERROR", "Failed to activate audio session", error)
    }
  }

  @objc
  func deactivateAudioSession() {
    let audioSession = AVAudioSession.sharedInstance()
    do {
      try audioSession.setActive(false, options: .notifyOthersOnDeactivation)
      print("Swift: 오디오 세션 비활성화 성공.")
    } catch {
      print("Swift: 오디오 세션 비활성화 실패: \(error.localizedDescription)")
    }
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
}