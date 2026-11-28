QuantDinger Android release signing

Signing credentials are local-only and must never be committed to this public
repository. Store release keystores and passwords securely or in CI secrets.
Only this setup guide is tracked under signing/.

Local setup:
  - Place the release keystore in signing/.
  - Create signing/keystore.properties with storeFile, storePassword, keyAlias,
    and keyPassword. storeFile is resolved relative to this signing directory.
  - android/app/build.gradle loads these properties when the file exists.

The repository ignores signing/*.jks, signing/*.keystore, and
signing/keystore.properties. Do not force-add these files or include credentials
in logs, screenshots, or documentation.
