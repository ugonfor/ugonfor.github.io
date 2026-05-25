// site-config.mjs — _config.yml 대체
// Jekyll 설정을 JS 객체로 이전

export const site = {
  // Basic Information
  title: "Hyogon Ryu",
  position: "Applied Research Scientist",
  affiliation: "Krafton AI",
  affiliation_link: "https://www.krafton.ai/ko/",
  email: "hyogon.ryu (at) kaist.ac.kr",

  // SEO
  keywords: "Hyogon Ryu, research, publications.",
  description: "Hyogon Ryu's personal academic homepage.",
  canonical: "https://ugonfor.kr",

  // Links
  google_scholar: "https://scholar.google.com/citations?user=Xq5B3LQAAAAJ",
  cv_link: "assets/files/CV_HyogonRyu.pdf",
  github_link: "https://github.com/ugonfor",
  linkedin: "https://www.linkedin.com/in/hyogon-ryu/",

  // Images
  avatar: "/assets/img/avatar.jfif",
  favicon: "/assets/img/favicon_io/favicon-32x32.png",
  favicon_dark: "",

  // Playground
  playground_llm_api: "https://playground-llm-proxy-733855937288.asia-northeast3.run.app/api/npc-chat",
  playground_turnstile_site_key: "",
  playground_firebase: {
    apiKey: "AIzaSyAJeq1BseMP7Z5VdKLs_6Naq7pyD2N64mw",
    authDomain: "ugonfor-playground-ef32a.firebaseapp.com",
    databaseURL: "https://ugonfor-playground-ef32a-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "ugonfor-playground-ef32a",
  },
};
