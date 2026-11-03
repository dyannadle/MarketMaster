# Build & Packaging Instructions
## Project: MarketMaster Academy
**Artifacts**: Web Static/Node Build, Backend Spring Boot JAR, Android APK  

### 1. Build Frontend Web Application
```bash
cd frontend
npm install
npm run build
# Output generated in .next/ or out/
```

### 2. Build Backend Application JAR
```bash
cd backend
mvn clean package -DskipTests=false
# Output: target/marketmaster-backend-1.0.0.jar
```

### 3. Build Native Android Application APK
```bash
cd android
./gradlew assembleRelease
# Output: app/build/outputs/apk/release/app-release-unsigned.apk
```

