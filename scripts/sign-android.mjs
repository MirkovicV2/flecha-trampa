import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const signingDirectory = join(root, '.tools', 'android-signing');
const keyStore = join(signingDirectory, 'internal-release.p12');
const credentialsPath = join(signingDirectory, 'credentials.json');
const outputDirectory = join(root, '.artifacts', 'releases');
const sdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
if (!sdk) throw new Error('Load scripts/use-android-tools.ps1 before signing.');
const buildTools = join(sdk, 'build-tools', '36.0.0');
const unsigned = join(root, 'android/app/build/outputs/apk/release/app-release-unsigned.apk');
const aligned = join(outputDirectory, 'aligned-release.apk');
const fileName = `flecha-trampa-v${version}-android.apk`;
const signed = join(outputDirectory, fileName);
const execute = (command, args, env = process.env) =>
  execFileSync(command, args, { cwd: root, env, encoding: 'utf8', windowsHide: true });

if (!existsSync(unsigned)) throw new Error('Build the unsigned release APK first.');
execute('git.exe', ['check-ignore', keyStore, credentialsPath]);
if (existsSync(keyStore) && !existsSync(credentialsPath)) {
  throw new Error(
    'Signing key exists but its password file is missing. Restore its secure backup; do not replace the key.',
  );
}
mkdirSync(signingDirectory, { recursive: true });
mkdirSync(outputDirectory, { recursive: true });
if (!existsSync(credentialsPath)) {
  writeFileSync(
    credentialsPath,
    JSON.stringify({
      alias: 'flecha-trampa-internal',
      storePassword: randomBytes(32).toString('base64url'),
    }),
    { mode: 0o600 },
  );
}
const credentials = JSON.parse(readFileSync(credentialsPath, 'utf8'));
if (!credentials.alias || !credentials.storePassword)
  throw new Error('Invalid local signing credentials.');
const privateEnvironment = {
  ...process.env,
  FLECHA_ANDROID_STORE_PASSWORD: credentials.storePassword,
};
if (!existsSync(keyStore)) {
  execute(
    'keytool.exe',
    [
      '-genkeypair',
      '-noprompt',
      '-keystore',
      keyStore,
      '-storetype',
      'PKCS12',
      '-alias',
      credentials.alias,
      '-keyalg',
      'RSA',
      '-keysize',
      '3072',
      '-validity',
      '10000',
      '-dname',
      'CN=FLECHA TRAMPA Internal Testing,OU=Development,O=FlechaTrampa,C=ES',
      '-storepass:env',
      'FLECHA_ANDROID_STORE_PASSWORD',
      '-keypass:env',
      'FLECHA_ANDROID_STORE_PASSWORD',
    ],
    privateEnvironment,
  );
}

execute(join(buildTools, 'zipalign.exe'), ['-P', '16', '-f', '4', unsigned, aligned]);
execute(
  'java.exe',
  [
    '-jar',
    join(buildTools, 'lib', 'apksigner.jar'),
    'sign',
    '--ks',
    keyStore,
    '--ks-key-alias',
    credentials.alias,
    '--ks-pass',
    'env:FLECHA_ANDROID_STORE_PASSWORD',
    '--key-pass',
    'env:FLECHA_ANDROID_STORE_PASSWORD',
    '--out',
    signed,
    aligned,
  ],
  privateEnvironment,
);
const signature = execute('java.exe', [
  '-jar',
  join(buildTools, 'lib', 'apksigner.jar'),
  'verify',
  '--verbose',
  '--print-certs',
  signed,
]);
execute(join(buildTools, 'zipalign.exe'), ['-c', '-P', '16', '4', signed]);
const badging = execute(join(buildTools, 'aapt.exe'), ['dump', 'badging', signed]);
if (
  !badging.includes("package: name='com.flechatrampa.game'") ||
  !badging.includes(`versionName='${version}'`) ||
  badging.includes('application-debuggable')
) {
  throw new Error('APK identity, version or release configuration is invalid.');
}
const packagedFiles = execute('jar.exe', ['tf', signed]);
if (
  !packagedFiles.includes('assets/public/index.html') ||
  !/assets\/public\/assets\/BoardScene-[^\n]+\.js/.test(packagedFiles)
) {
  throw new Error('APK does not contain the bundled game.');
}
const hash = createHash('sha256').update(readFileSync(signed)).digest('hex');
writeFileSync(join(outputDirectory, 'SHA256SUMS.txt'), `${hash}  ${fileName}\n`);
writeFileSync(join(outputDirectory, `flecha-trampa-v${version}-signature.txt`), signature);
console.log(`Signed and verified: ${signed}`);
console.log(`SHA-256: ${hash}`);
console.log('Keep .tools/android-signing private and backed up for future compatible updates.');
