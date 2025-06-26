// AudioSessionModule.swift

import Foundation
import AVFoundation

@objc(AudioSessionModule)
class AudioSessionModule: NSObject {

  @objc
  func activateAudioSession(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let audioSession = AVAudioSession.sharedInstance()
    do {
      try audioSession.setCategory(.playAndRecord, mode: .videoRecording, options: [.mixWithOthers, .defaultToSpeaker, .allowBluetooth])
      try audioSession.setActive(true)
      print("Swift: 오디오 세션 활성화 성공.")
      resolve("Audio session activated.")
    } catch {
      print("Swift: 오디오 세션 활성화 실패: \(error.localizedDescription)")
      reject("AUDIO_SESSION_ERROR", "Failed to activate audio session", error)
    }
  }
  
  // --- [추가] 오디오 세션을 비활성화하는 함수 ---
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
