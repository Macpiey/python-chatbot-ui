const functions = require('@google-cloud/functions-framework');
const { Storage } = require('@google-cloud/storage');

const storage = new Storage();
const BUCKET_NAME = 'commodities-ai-releases';

/**
 * Cloud Function: check-update
 * 
 * Endpoints:
 *   GET  /check-update?currentVersion=1.0.0  → Returns update info if available
 *   GET  /check-update?action=download&version=1.1.0 → Returns signed download URL
 *   POST /check-update (with JSON body) → Updates version metadata (deploy-only)
 */
functions.http('checkUpdate', async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, X-Deploy-Key');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  try {
    if (req.method === 'GET') {
      const { currentVersion, action, version } = req.query;

      // Action: Generate signed download URL
      if (action === 'download') {
        if (!version) {
          return res.status(400).json({ error: 'version parameter is required' });
        }

        const fileName = `releases/${version}/Commodities_AI_Setup.exe`;
        const file = storage.bucket(BUCKET_NAME).file(fileName);

        const [exists] = await file.exists();
        if (!exists) {
          return res.status(404).json({ error: `Version ${version} not found` });
        }

        // Generate a signed URL valid for 15 minutes
        const [signedUrl] = await file.getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        });

        return res.json({ downloadUrl: signedUrl });
      }

      // Action: Check for update
      if (!currentVersion) {
        return res.status(400).json({ error: 'currentVersion parameter is required' });
      }

      // Read version metadata from GCS
      const metadataFile = storage.bucket(BUCKET_NAME).file('metadata/latest.json');
      const [exists] = await metadataFile.exists();

      if (!exists) {
        return res.json({
          updateAvailable: false,
          message: 'No update information available'
        });
      }

      const [content] = await metadataFile.download();
      const metadata = JSON.parse(content.toString());

      const updateAvailable = compareVersions(metadata.version, currentVersion) > 0;

      return res.json({
        updateAvailable,
        currentVersion,
        latestVersion: metadata.version,
        releaseNotes: metadata.releaseNotes || '',
        releaseDate: metadata.releaseDate || '',
        fileSize: metadata.fileSize || 0,
        mandatory: metadata.mandatory || false,
      });
    }

    if (req.method === 'POST') {
      // Protect POST with a simple deploy key
      const deployKey = req.headers['x-deploy-key'];
      if (deployKey !== process.env.DEPLOY_KEY) {
        return res.status(403).json({ error: 'Invalid deploy key' });
      }

      const { version, releaseNotes, fileSize, mandatory } = req.body;

      if (!version) {
        return res.status(400).json({ error: 'version is required' });
      }

      const metadata = {
        version,
        releaseNotes: releaseNotes || '',
        releaseDate: new Date().toISOString(),
        fileSize: fileSize || 0,
        mandatory: mandatory || false,
      };

      // Save metadata to GCS
      const metadataFile = storage.bucket(BUCKET_NAME).file('metadata/latest.json');
      await metadataFile.save(JSON.stringify(metadata, null, 2), {
        contentType: 'application/json',
      });

      return res.json({ success: true, metadata });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Compare two semver strings.
 * Returns > 0 if a > b, 0 if equal, < 0 if a < b
 */
function compareVersions(a, b) {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA !== numB) return numA - numB;
  }
  return 0;
}
