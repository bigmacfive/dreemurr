# Kinopio 개인 워크스페이스 (오프라인·라이트)

민규 리의 Mac 로컬 복사본입니다. 업스트림은 [kinopio-club/kinopio-client](https://github.com/kinopio-club/kinopio-client)이고, **이 폴더에서만** 코드를 고칩니다. kinopio-club에 PR이나 푸시하지 마세요.

라이선스는 **PolyForm Noncommercial 1.0.0**입니다. 개인·취미로 읽고 고치는 일은 허용됩니다.

## 시작하기

```bash
cd ~/Desktop/kinopio
npm install
npm run dev
```

브라우저에서 **http://localhost:8080/app** 을 엽니다. `/` 도 `/app`으로 갑니다.

이 복사본은 **완전 오프라인**입니다.

- 테마는 **라이트만**. 다크/시스템 토글과 `T` 단축키가 없습니다.
- `api.kinopio.club` / `wss://api.kinopio.club` 요청을 보내지 않습니다. 웹소켓 플러그인을 뺐고, API 페치·작업 큐는 no-op입니다.
- 카드·연결·박스는 `src/cache.js` **indexedDB**에만 남습니다. 새로고침해도 이 브라우저에 유지됩니다.
- Share, Sign Up, Explore, Live, 초대, 결제, 프레즌스 UI를 숨겼습니다.
- 예전 로그인 `apiKey`가 IDB에 있어도 부팅 때 지웁니다.

`.env.local`의 `VITE_PROD_SERVER`는 `false`입니다. 서버가 없어도 위 no-op이 실제 차단입니다.

## 코드 고치기

- 앱 코드는 **JavaScript + Vue 3 + Pug + Stylus**입니다.
- 캔버스는 `src/views/Space.vue`, 카드는 `src/components/Card.vue`, 전역 UI 상태는 `src/stores/useGlobalStore.js`입니다.
- 새 컴포넌트는 `src/components/NewBlankTemplate.vue`를 복제하세요.
- `src/utils.js`는 DOM·공용 함수만 두고, 스토어에 직접 접근하지 마세요.
- `npm run dev`가 켜져 있으면 저장 후 브라우저가 바로 갱신됩니다.

## 서버 / API

공개된 `kinopio-server`는 없습니다. 이 로컬 복사본은 공식 API에도 붙지 않습니다. 클라우드 동기화나 로그인이 필요하면 공식 [kinopio.club](https://kinopio.club)을 쓰세요. 이 폴더의 커스터마이즈와는 별개입니다.

업스트림 영문 설명은 `README.md`에 있습니다.
