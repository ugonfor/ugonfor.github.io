// site-config.mjs — _config.yml 대체
// Jekyll 설정을 JS 객체로 이전

export const site = {
  // Basic Information
  title: "Hyogon Ryu",
  position: "Applied Research Engineer",
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

  // Font
  font: "Serif",

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

// Publications data — _data/publications.yml 대체
export const publications = [
  {
    title: "DGQ: Distribution-Aware Group Quantization for Text-to-Image Diffusion Models",
    authors: "<strong>Hyogon Ryu</strong>, NaHyeon Park, Hyunjung Shim",
    conference_short: "ICLR",
    conference: 'International Conference on Learning Representations <strong>(ICLR)</strong>, 2025.',
    pdf: "https://arxiv.org/abs/2501.04304",
    code: "https://github.com/ugonfor/DGQ",
    page: "https://ugonfor.kr/DGQ",
    image: "https://ugonfor.kr/DGQ/static/images/teaser.jpg",
  },
  {
    title: "Memory-Efficient Fine-Tuning for Quantized Diffusion Model",
    authors: "<strong>Hyogon Ryu</strong>, Seohyun Lim, Hyunjung Shim",
    conference_short: "ECCV",
    conference: 'European Conference on Computer Vision <strong>(ECCV)</strong>, 2024.',
    pdf: "https://arxiv.org/abs/2401.04339",
    code: "https://github.com/ugonfor/TuneQDM",
    image: "/assets/img/teaser_TuneQDM.png",
  },
];
