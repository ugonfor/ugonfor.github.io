---
layout: default
hide_header: true
---

<style>
/* Keep the academic profile independent of the legacy page chrome. */
html.landing-page body { margin: 0; padding: 0; background: #fff; }
html.landing-page .top-menu, html.landing-page .wrapper > footer { display: none; }
html.landing-page .wrapper { width: auto; max-width: none; margin: 0; padding: 0; }
html.landing-page .wrapper > section { width: 100%; margin: 0; padding: 0; }
#hyogon-simple { background: #fff; color: #202020; padding: 42px 24px; font: 16px/1.6 Charter, 'Bitstream Charter', 'Sitka Text', Cambria, Georgia, serif; }
#hyogon-simple * { box-sizing: border-box; }
#hyogon-simple main { max-width: 650px; margin: auto; }
#hyogon-simple a { color: #29549b; text-decoration: none; }
#hyogon-simple a:hover { text-decoration: underline; }
#hyogon-simple a:focus-visible { outline: 2px solid #29549b; outline-offset: 3px; }
#hyogon-simple header { display: flex !important; position: static; float: none; width: auto; align-items: center; justify-content: space-between; gap: 24px; margin: 0 0 24px; padding: 0; text-align: left; }
#hyogon-simple h1 { font: 700 26px/1.2 Charter, 'Bitstream Charter', 'Sitka Text', Cambria, Georgia, serif; margin: 0 0 8px; color: inherit; }
#hyogon-simple header p { margin: 0 0 7px; font-size: 15px; }
#hyogon-simple .links { display: flex; gap: 12px; flex-wrap: wrap; font-size: 16px; }
#hyogon-simple img { width: 100px; height: 125px; object-fit: cover; border-radius: 2px; flex-shrink: 0; }
#hyogon-simple p { margin: 0 0 14px; }
#hyogon-simple h2 { font-size: 21px; font-weight: 600; line-height: 1.3; border-bottom: 1px solid #dedede; padding-bottom: 5px; margin: 30px 0 10px; color: inherit; }
#hyogon-simple ul { padding-left: 20px; margin: 0; }
#hyogon-simple li { padding-left: 2px; margin: 0 0 11px; }
#hyogon-simple .meta { color: #666; font-size: 15px; }
#hyogon-simple .work-year { color: #666; font-size: 14px; margin-right: 14px; }
#hyogon-simple .paper { margin-bottom: 15px; }
#hyogon-simple .paper p { margin: 0; }
#hyogon-simple .paper p:last-child { display: flex; flex-wrap: wrap; column-gap: 12px; }
#hyogon-simple .paper p:last-child i { margin-right: 4px; }
#hyogon-simple footer { position: static; width: auto; font-size: 12px; color: #666; margin: 25px 0 0; padding: 0; border: 0; }
@media (max-width: 450px) {
  #hyogon-simple { padding: 25px 20px; }
  #hyogon-simple header { align-items: flex-start; gap: 12px; }
  #hyogon-simple h1 { font-size: 24px; }
  #hyogon-simple img { width: 75px; height: 94px; }
  #hyogon-simple .links { gap: 6px 12px; }
}
</style>

<div id="hyogon-simple">
<main>
<header><div><h1>Hyogon Ryu</h1><p>LLM Engineering Team Lead at KRAFTON AI</p><nav class="links" aria-label="Profile links"><a href="mailto:ugonfor@gmail.com">Email</a><a href="https://x.com/ugonfor">X</a><a href="https://github.com/ugonfor">GitHub</a><a href="https://scholar.google.com/citations?user=Xq5B3LQAAAAJ">Scholar</a><a href="https://www.linkedin.com/in/hyogon-ryu/">LinkedIn</a><a href="/posts/">Writing</a><a href="/assets/files/CV_HyogonRyu.pdf">CV</a></nav></div><img src="/assets/img/avatar.jfif" width="100" height="125" alt="Hyogon Ryu"></header>
<p>I lead the LLM Engineering Team at KRAFTON AI, working with <a href="https://kangwooklee.com/">Kangwook Lee</a>.</p>
<p>I work on ML systems optimization &amp; engineering across pretraining, RL, and inference. We’re a small team, so we work across the stack and tackle whatever needs optimizing.</p>
<p>I received my M.S. from KAIST, advised by <a href="https://kaist-cvml.github.io/">Hyunjung Shim</a>, and my B.S. in Cyber Defense from Korea University. My research was on diffusion model quantization; before that, I was a reverse engineer on <a href="https://cykor.kr/">CyKor</a>, the best white-hat hacking team in South Korea.</p>
<h2>Work</h2>
<ul><li><span class="work-year">2026</span><strong>Raon.</strong> KRAFTON’s foundation model family. <a href="https://huggingface.co/KRAFTON">Hugging Face</a></li><li><span class="work-year">2025</span><strong>SmartZoi.</strong> Social AI for the life simulation game, inZOI. <a href="https://www.youtube.com/watch?v=Pk9z1upOj3U">NVIDIA video</a></li></ul>
<h2>Publications</h2>
<div class="paper"><p>Online Agent-as-a-Judge: Situation-Generating Evaluation for Interactive Agents</p><p class="meta">Hyogon Ryu, Jeonghwan Kim, Yewon Lim, Chaeun Lee, Jeongwook Kim, Donghoon Ham</p><p><i>ICML 2026 Workshop</i><a href="https://arxiv.org/abs/2606.08200">Paper</a><a href="https://krafton.ai/portfolio/online-agent-as-a-judge-situation-generating-evaluation-for-interactive-agents/">Overview</a></p></div>
<div class="paper"><p>Terminus-KIRA: Boosting Frontier Model Performance on Terminal-Bench with Minimal Harness</p><p><i>February 2026</i><a href="https://www.krafton.ai/blog/terminus_kira/">Tech blog</a><a href="https://github.com/krafton-ai/KIRA">Code</a></p></div>
<div class="paper"><p>DGQ: Distribution-Aware Group Quantization for Text-to-Image Diffusion Models</p><p class="meta">Hyogon Ryu, NaHyeon Park, Hyunjung Shim</p><p><i>ICLR 2025</i><a href="https://arxiv.org/abs/2501.04304">Paper</a><a href="https://ugonfor.kr/DGQ/">Project</a><a href="https://github.com/ugonfor/DGQ">Code</a></p></div>
<div class="paper"><p>Memory-Efficient Fine-Tuning for Quantized Diffusion Model</p><p class="meta">Hyogon Ryu, Seohyun Lim, Hyunjung Shim</p><p><i>ECCV 2024</i><a href="https://github.com/ugonfor/TuneQDM">Code</a></p></div>
<h2>Experience</h2>
<ul><li>LLM Engineering Team Lead, AI Model Research Dept., KRAFTON AI<br><span class="meta">June 2026 – present</span></li><li>Research Engineer, Simulation AI Team, KRAFTON AI<br><span class="meta">April 2025 – May 2026</span></li><li>Software Engineer Intern, NAVER<br><span class="meta">January – February 2022</span></li></ul>
<h2>Education</h2>
<ul><li>M.S. in Artificial Intelligence, KAIST<br><span class="meta">2023 – 2025<br>Advisor: <a href="https://kaist-cvml.github.io/">Hyunjung Shim</a></span></li><li>B.S. in Cyber Defense, Korea University<br><span class="meta">2019 – 2023</span></li><li>Korea Science Academy of KAIST<br><span class="meta">2016 – 2019</span></li></ul>
<footer>Last updated: November 2026.</footer>
</main>
</div>
