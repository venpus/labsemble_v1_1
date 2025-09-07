const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { pool } = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// APK 업로드를 위한 multer 설정
const apkStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'apk');
    
    // 폴더가 없으면 생성
    if (!fs.existsSync(uploadPath)) {
      try {
        fs.mkdirSync(uploadPath, { recursive: true });
        console.log(`✅ [App-Update] APK 업로드 디렉토리 생성: ${uploadPath}`);
      } catch (error) {
        console.error(`❌ [App-Update] APK 업로드 디렉토리 생성 실패: ${uploadPath}`, error);
        return cb(error);
      }
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const versionCode = req.body.versionCode;
    const filename = `v${versionCode}.apk`;
    console.log(`📁 [App-Update] APK 파일명 생성: ${filename}`);
    cb(null, filename);
  }
});

const apkUpload = multer({ 
  storage: apkStorage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB 제한
  },
  fileFilter: function (req, file, cb) {
    // APK 파일만 허용
    if (file.mimetype === 'application/vnd.android.package-archive' || file.originalname.endsWith('.apk')) {
      cb(null, true);
    } else {
      cb(new Error('APK 파일만 업로드 가능합니다.'), false);
    }
  }
});

// 버전 목록 조회 API
router.get('/versions', authMiddleware, async (req, res) => {
  try {
    // 관리자 권한 확인
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: '관리자 권한이 필요합니다.'
      });
    }

    const [versions] = await pool.execute(`
      SELECT 
        id,
        version_code,
        version_name,
        download_url,
        release_notes,
        force_update,
        min_sdk,
        target_sdk,
        file_size,
        checksum,
        is_active,
        created_at
      FROM app_versions 
      ORDER BY version_code DESC
    `);

    res.json({
      success: true,
      versions: versions
    });

  } catch (error) {
    console.error('📱 [App-Update] 버전 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '버전 목록 조회 중 오류가 발생했습니다.'
    });
  }
});

// 앱 버전 체크 API (공개 접근)
router.get('/version-check', async (req, res) => {
  try {
    const { versionCode, versionName } = req.query;
    
    console.log('📱 [App-Update] 버전 체크 요청:', { versionCode, versionName });
    
    if (!versionCode || !versionName) {
      return res.status(400).json({
        success: false,
        error: 'versionCode와 versionName이 필요합니다.'
      });
    }
    
    // 최신 버전 정보 조회
    const [versions] = await pool.execute(`
      SELECT 
        version_code,
        version_name,
        download_url,
        release_notes,
        force_update,
        min_sdk,
        target_sdk,
        file_size,
        checksum,
        created_at
      FROM app_versions 
      WHERE is_active = true 
      ORDER BY version_code DESC 
      LIMIT 1
    `);
    
    if (versions.length === 0) {
      return res.status(404).json({
        success: false,
        error: '사용 가능한 버전이 없습니다.'
      });
    }
    
    const latestVersion = versions[0];
    const currentVersionCode = parseInt(versionCode);
    const latestVersionCode = latestVersion.version_code;
    
    const needsUpdate = currentVersionCode < latestVersionCode;
    
    console.log('📱 [App-Update] 버전 비교 결과:', {
      current: currentVersionCode,
      latest: latestVersionCode,
      needsUpdate
    });
    
    res.json({
      success: true,
      needsUpdate,
      currentVersion: {
        versionCode: currentVersionCode,
        versionName: versionName
      },
      latestVersion: {
        versionCode: latestVersion.version_code,
        versionName: latestVersion.version_name,
        downloadUrl: latestVersion.download_url,
        releaseNotes: latestVersion.release_notes,
        forceUpdate: latestVersion.force_update === 1,
        minSdk: latestVersion.min_sdk,
        targetSdk: latestVersion.target_sdk,
        fileSize: latestVersion.file_size,
        checksum: latestVersion.checksum,
        releaseDate: latestVersion.created_at
      }
    });
    
  } catch (error) {
    console.error('📱 [App-Update] 버전 체크 오류:', error);
    res.status(500).json({
      success: false,
      error: '버전 체크 중 오류가 발생했습니다.'
    });
  }
});

// APK 다운로드 API (공개 접근)
router.get('/download/:versionCode', async (req, res) => {
  try {
    const { versionCode } = req.params;
    
    console.log('📱 [App-Update] APK 다운로드 요청:', { versionCode });
    
    // 버전 정보 조회
    const [versions] = await pool.execute(`
      SELECT 
        version_code,
        version_name,
        download_url,
        file_size,
        checksum
      FROM app_versions 
      WHERE version_code = ? AND is_active = true
    `, [versionCode]);
    
    if (versions.length === 0) {
      return res.status(404).json({
        success: false,
        error: '해당 버전을 찾을 수 없습니다.'
      });
    }
    
    const version = versions[0];
    const filePath = path.join(__dirname, '..', 'uploads', 'apk', version.download_url);
    
    // 파일 존재 확인
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'APK 파일을 찾을 수 없습니다.'
      });
    }
    
    // 파일 정보 설정
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    
    // 응답 헤더 설정
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', `attachment; filename="MJ유통매니저_v${version.version_name}.apk"`);
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Cache-Control', 'no-cache');
    
    // 파일 스트림으로 전송
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    console.log('📱 [App-Update] APK 다운로드 완료:', {
      versionCode,
      fileName: version.download_url,
      fileSize
    });
    
  } catch (error) {
    console.error('📱 [App-Update] APK 다운로드 오류:', error);
    res.status(500).json({
      success: false,
      error: 'APK 다운로드 중 오류가 발생했습니다.'
    });
  }
});

// 버전 목록 조회 API (관리자용)
router.get('/versions', authMiddleware, async (req, res) => {
  try {
    // 관리자 권한 확인
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: '관리자 권한이 필요합니다.'
      });
    }
    
    const [versions] = await pool.execute(`
      SELECT 
        id,
        version_code,
        version_name,
        download_url,
        release_notes,
        force_update,
        min_sdk,
        target_sdk,
        file_size,
        checksum,
        created_at,
        is_active
      FROM app_versions 
      ORDER BY version_code DESC
    `);
    
    res.json({
      success: true,
      versions: versions
    });
    
  } catch (error) {
    console.error('📱 [App-Update] 버전 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '버전 목록 조회 중 오류가 발생했습니다.'
    });
  }
});

// 새 버전 등록 API (관리자용)
router.post('/versions', authMiddleware, async (req, res) => {
  try {
    // 관리자 권한 확인
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: '관리자 권한이 필요합니다.'
      });
    }
    
    const {
      versionCode,
      versionName,
      releaseNotes,
      forceUpdate = false,
      minSdk = 33,
      targetSdk = 36,
      fileSize,
      checksum
    } = req.body;
    
    // 필수 필드 검증
    if (!versionCode || !versionName) {
      return res.status(400).json({
        success: false,
        error: 'versionCode와 versionName은 필수입니다.'
      });
    }
    
    // 기존 버전 비활성화
    await pool.execute(`
      UPDATE app_versions 
      SET is_active = false 
      WHERE version_code < ?
    `, [versionCode]);
    
    // 새 버전 등록
    const [result] = await pool.execute(`
      INSERT INTO app_versions (
        version_code, version_name, download_url, release_notes, 
        force_update, min_sdk, target_sdk, file_size, checksum
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      versionCode, versionName, `v${versionCode}.apk`, releaseNotes,
      forceUpdate, minSdk, targetSdk, fileSize, checksum
    ]);
    
    console.log('📱 [App-Update] 새 버전 등록 완료:', {
      versionCode,
      versionName,
      id: result.insertId
    });
    
    res.status(201).json({
      success: true,
      message: '새 버전이 등록되었습니다.',
      versionId: result.insertId
    });
    
  } catch (error) {
    console.error('📱 [App-Update] 버전 등록 오류:', error);
    res.status(500).json({
      success: false,
      error: '버전 등록 중 오류가 발생했습니다.'
    });
  }
});

// APK 업로드 API
router.post('/upload', authMiddleware, apkUpload.single('apk'), async (req, res) => {
  try {
    // 관리자 권한 확인
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: '관리자 권한이 필요합니다.'
      });
    }

    const {
      versionCode,
      versionName,
      releaseNotes,
      forceUpdate,
      minSdk,
      targetSdk
    } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'APK 파일이 필요합니다.'
      });
    }

    // 필수 필드 검증
    if (!versionCode || !versionName) {
      return res.status(400).json({
        success: false,
        error: 'versionCode와 versionName은 필수입니다.'
      });
    }

    console.log('📱 [App-Update] APK 업로드 시작:', {
      versionCode,
      versionName,
      fileName: req.file.filename,
      fileSize: req.file.size
    });

    // 파일 체크섬 계산
    const fileBuffer = fs.readFileSync(req.file.path);
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // 기존 버전 비활성화
    await pool.execute(`
      UPDATE app_versions 
      SET is_active = false 
      WHERE version_code < ?
    `, [versionCode]);

    // 새 버전 등록
    const [result] = await pool.execute(`
      INSERT INTO app_versions (
        version_code, version_name, download_url, release_notes, 
        force_update, min_sdk, target_sdk, file_size, checksum
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      versionCode, 
      versionName, 
      `v${versionCode}.apk`, 
      releaseNotes || '',
      forceUpdate === 'true' ? 1 : 0, 
      minSdk || 33, 
      targetSdk || 36, 
      req.file.size,
      checksum
    ]);

    console.log('📱 [App-Update] APK 업로드 완료:', {
      versionCode,
      versionName,
      versionId: result.insertId,
      checksum: checksum.substring(0, 16) + '...'
    });

    res.json({
      success: true,
      message: 'APK 업로드가 완료되었습니다.',
      versionId: result.insertId,
      version: {
        versionCode: parseInt(versionCode),
        versionName,
        fileSize: req.file.size,
        checksum
      }
    });

  } catch (error) {
    console.error('📱 [App-Update] APK 업로드 오류:', error);
    
    // 업로드된 파일이 있으면 삭제
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: 'APK 업로드 중 오류가 발생했습니다.'
    });
  }
});

// 버전 삭제 API
router.delete('/versions/:id', authMiddleware, async (req, res) => {
  try {
    // 관리자 권한 확인
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: '관리자 권한이 필요합니다.'
      });
    }

    const { id } = req.params;

    // 버전 정보 조회
    const [versions] = await pool.execute(
      'SELECT download_url FROM app_versions WHERE id = ?',
      [id]
    );

    if (versions.length === 0) {
      return res.status(404).json({
        success: false,
        error: '해당 버전을 찾을 수 없습니다.'
      });
    }

    // 파일 삭제
    const filePath = path.join(__dirname, '..', 'uploads', 'apk', versions[0].download_url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // 데이터베이스에서 삭제
    await pool.execute('DELETE FROM app_versions WHERE id = ?', [id]);

    res.json({
      success: true,
      message: '버전이 삭제되었습니다.'
    });

  } catch (error) {
    console.error('📱 [App-Update] 버전 삭제 오류:', error);
    res.status(500).json({
      success: false,
      error: '버전 삭제 중 오류가 발생했습니다.'
    });
  }
});

// 버전 상태 변경 API
router.patch('/versions/:id', authMiddleware, async (req, res) => {
  try {
    // 관리자 권한 확인
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: '관리자 권한이 필요합니다.'
      });
    }

    const { id } = req.params;
    const { isActive } = req.body;

    await pool.execute(
      'UPDATE app_versions SET is_active = ? WHERE id = ?',
      [isActive ? 1 : 0, id]
    );

    res.json({
      success: true,
      message: isActive ? '버전이 활성화되었습니다.' : '버전이 비활성화되었습니다.'
    });

  } catch (error) {
    console.error('📱 [App-Update] 버전 상태 변경 오류:', error);
    res.status(500).json({
      success: false,
      error: '버전 상태 변경 중 오류가 발생했습니다.'
    });
  }
});

module.exports = router;
