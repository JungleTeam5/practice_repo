// scripts/patch-ffmpeg.js
const fs = require("fs");
const path = require("path");

// Path to the FFmpeg build.gradle file
const ffmpegBuildGradlePath = path.join(
  __dirname,
  "../node_modules/ffmpeg-kit-react-native/android/build.gradle"
);

// Make sure the file exists
if (!fs.existsSync(ffmpegBuildGradlePath)) {
  console.error("❌ FFmpeg build.gradle file not found!");
  process.exit(1);
}

// Read the original content
let content = fs.readFileSync(ffmpegBuildGradlePath, "utf8");

// Fix the content by ensuring:
// 1. No implementation in buildscript block
// 2. flatDir repository in the right place
// 3. Correct implementation in dependencies block

// Remove any implementation from buildscript block
content = content.replace(
  /buildscript\s*{[\s\S]*?dependencies\s*{[\s\S]*?implementation\(name:\s*'ffmpeg-kit-full-gpl',\s*ext:\s*'aar'\)[\s\S]*?}[\s\S]*?}/g,
  (match) =>
    match.replace("implementation(name: 'ffmpeg-kit-full-gpl', ext: 'aar')", "")
);

// Replace the implementation line in the main dependencies block
const originalDependencyLine =
  "implementation 'com.arthenica:ffmpeg-kit-' + safePackageName(safeExtGet('ffmpegKitPackage', 'https')) + ':' + safePackageVersion(safeExtGet('ffmpegKitPackage', 'https'))";
const newDependencyLine =
  "implementation(name: 'ffmpeg-kit-full-gpl', ext: 'aar')";
content = content.replace(originalDependencyLine, newDependencyLine);

// Make sure flatDir repository is in the repositories block (not in buildscript)
if (!content.includes('flatDir { dirs "$rootDir/libs" }')) {
  content = content.replace(
    /repositories\s*{/,
    'repositories {\n flatDir { dirs "$rootDir/libs" }'
  );
}

// Write the modified content back
fs.writeFileSync(ffmpegBuildGradlePath, content, "utf8");
console.log("✅ Successfully patched FFmpeg build.gradle file");