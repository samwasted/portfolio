const fs = require('fs');

let content = fs.readFileSync('Projects.astro', 'utf8');

// 1. Add close button
content = content.replace(
  '<article class="projects-detail" id="projects-detail">',
  `<article class="projects-detail" id="projects-detail">
      <button id="mobile-detail-close" class="mobile-close-btn" aria-label="Close details">
        <div class="drag-handle"></div>
      </button>`
);

// 2. Add layout and closeBtn to JS
content = content.replace(
  "const detailContainer = document.getElementById('detail-container');",
  `const detailContainer = document.getElementById('detail-container');
    const layout = document.querySelector('.projects-layout');
    const closeBtn = document.getElementById('mobile-detail-close');`
);

// 3. Rewrite selectProject logic
const selectProjectRegex = /function selectProject\(index: number\) \{([\s\S]*?)\}\n\n    cards\.forEach/m;
const newSelectProject = `function selectProject(index: number) {
      const p = projects[index];
      if (!p) return;

      const isMobile = window.innerWidth <= 900;
      let wasClosed = false;

      if (layout && isMobile) {
        if (!layout.classList.contains('has-active-project')) {
          wasClosed = true;
          layout.classList.add('has-active-project');
        }
      }

      // Update active state on cards
      cards.forEach((card, i) => {
        card.classList.toggle('active', i === index);
      });

      const updateContent = () => {
        if (detailName) detailName.textContent = p.name;
        if (detailSummary) detailSummary.textContent = p.summary;
        if (detailDesc) detailDesc.textContent = p.description;
        if (detailText) detailText.textContent = p.detail;
        
        if (detailFeatures) {
          detailFeatures.innerHTML = \`
            <h4 class="section-heading">Key Features</h4>
            <ul>
              \${p.features.map((f: string) => \`<li>\${f}</li>\`).join('')}
            </ul>
          \`;
        }

        if (detailTech) {
          detailTech.innerHTML = \`
            <h4 class="section-heading">Technologies</h4>
            <div class="tech-tags">
              \${p.techStack.map((t: string) => \`<span class="tech-tag">\${t}</span>\`).join('')}
            </div>
          \`;
        }

        if (detailGithub) detailGithub.href = p.github;
        if (detailGithubText) detailGithubText.textContent = p.github.replace('https://github.com/', '');

        // Reset read more state when changing projects
        const currentReadMoreBtn = document.getElementById('read-more-btn');
        const currentReadMoreContent = document.getElementById('read-more-content');
        if (currentReadMoreBtn && currentReadMoreContent) {
          currentReadMoreBtn.setAttribute('aria-expanded', 'false');
          currentReadMoreContent.classList.remove('expanded');
          currentReadMoreBtn.innerHTML = 'Read More <span class="read-more-icon">+</span>';
        }
      };

      if (detailContainer) {
        if (isMobile && wasClosed) {
          // Opening from closed on mobile: update instantly so it slides up fully populated
          updateContent();
          detailContainer.style.opacity = '1';
          detailContainer.style.transform = 'translateY(0)';
        } else {
          // Desktop or switching on mobile: fade out -> update -> fade in
          detailContainer.style.opacity = '0';
          detailContainer.style.transform = 'translateY(10px)';
          setTimeout(() => {
            updateContent();
            detailContainer.style.opacity = '1';
            detailContainer.style.transform = 'translateY(0)';
          }, 300);
        }
      }

      if (isMobile) {
        const activeCard = cards[index] as HTMLElement;
        if (activeCard) {
          // Wait 150ms to ensure the layout has fully repainted the instant padding
          setTimeout(() => {
            const cardRect = activeCard.getBoundingClientRect();
            // The top 40dvh is visible. If the bottom of the card is below 35dvh, scroll it up!
            const bottomThreshold = window.innerHeight * 0.35; 
            const topThreshold = window.innerHeight * 0.10;
            
            if (cardRect.bottom > bottomThreshold || cardRect.top < topThreshold) {
              // Native robust scroll using CSS scroll-margin-top
              activeCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 150);
        }
      }
    }

    // Initial state setup
    if (window.innerWidth > 900) {
      if (cards.length > 0) {
        cards[0].classList.add('active');
        selectProject(0);
      }
    } else {
      cards.forEach(c => c.classList.remove('active'));
      if (layout) layout.classList.remove('has-active-project');
    }

    if (closeBtn) {
      const newCloseBtn = closeBtn.cloneNode(true);
      closeBtn.parentNode?.replaceChild(newCloseBtn, closeBtn);
      newCloseBtn.addEventListener('click', () => {
        if (layout) layout.classList.remove('has-active-project');
        cards.forEach(c => c.classList.remove('active'));
      });
    }

    cards.forEach`;

content = content.replace(selectProjectRegex, newSelectProject);

// 4. Update click listener
const oldClickListener = `// Only trigger if not already active
        if (!card.classList.contains('active')) {
          selectProject(idx);
        }`;

const newClickListener = `const isActive = card.classList.contains('active');
        
        if (window.innerWidth <= 900) {
          if (isActive && layout && layout.classList.contains('has-active-project')) {
            // Close the pane if clicking the active project again on mobile
            layout.classList.remove('has-active-project');
            cards.forEach(c => c.classList.remove('active'));
          } else {
            selectProject(idx);
          }
        } else {
          // Desktop behavior
          if (!isActive) {
            selectProject(idx);
          }
        }`;

content = content.replace(oldClickListener, newClickListener);

// 5. CSS Changes
content = content.replace('height: 100%;\n    display: flex;\n    flex-direction: column;', 'min-height: 100%;\n    display: flex;\n    flex-direction: column;');

// 6. Global CSS classes
content = content.replace('.section-heading {', ':global(.section-heading) {');
content = content.replace('.features-list ul {', ':global(.features-list ul) {');
content = content.replace('.features-list li {', ':global(.features-list li) {');
content = content.replace('.features-list li::before {', ':global(.features-list li::before) {');
content = content.replace('.tech-tags {', ':global(.tech-tags) {');
content = content.replace('.tech-tag {', ':global(.tech-tag) {');
content = content.replace('.tech-tag:hover {', ':global(.tech-tag:hover) {');

// 7. Mobile CSS
const oldMobileCSS = `@media (max-width: 900px) {
    .projects-layout {
      grid-template-columns: 1fr;
      grid-template-rows: auto 1fr;
    }

    .projects-sidebar {
      height: auto;
      border-right: none;
      border-bottom: 1px solid var(--border-strong);
      padding: 5rem 2rem 1.5rem 2rem;
    }

    .projects-list {
      flex-direction: row;
      overflow-x: auto;
      overflow-y: hidden;
      padding-right: 0;
      padding-bottom: 0.5rem;
    }

    .project-card {
      min-width: 200px;
      flex-shrink: 0;
    }

    .project-card::before {
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 0%;
      height: 2px;
      transition: width 0.3s ease;
    }

    .project-card.active::before {
      height: 2px;
      width: 60%;
    }

    .projects-detail {
      padding: 2rem;
      height: auto;
      overflow: visible;
    }

    .detail-body {
      flex-direction: column;
      gap: 2rem;
    }

    .detail-name {
      font-size: 2.5rem;
    }
  }`;

const newMobileCSS = `@media (max-width: 900px) {
    .projects-layout {
      display: block;
      height: 100dvh;
      width: 100%;
      overflow: hidden;
      position: relative;
    }

    .projects-sidebar {
      height: 100dvh;
      border-right: none;
      padding: 5rem 1.5rem 2rem 1.5rem;
      overflow-y: auto;
      overscroll-behavior: contain;
    }

    .projects-layout.has-active-project .projects-sidebar {
      padding-bottom: 65dvh;
    }

    .projects-list {
      flex-direction: column;
      overflow-x: hidden;
      overflow-y: visible;
      padding-right: 0;
      padding-bottom: 0.5rem;
    }

    .project-card {
      min-width: unset;
      flex-shrink: 0;
      scroll-margin-top: 12dvh;
    }

    .project-card::before {
      top: 50%;
      left: 0;
      transform: translateY(-50%);
      width: 2px;
      height: 0%;
      transition: height 0.3s ease;
    }

    .project-card.active::before {
      height: 60%;
      width: 2px;
    }

    .projects-detail {
      position: fixed;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 60dvh;
      padding: 3rem 1.5rem 2rem 1.5rem;
      background: rgba(10, 10, 10, 0.95);
      backdrop-filter: blur(15px);
      border-top: 1px solid var(--border-strong);
      border-radius: 24px 24px 0 0;
      box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.5);
      overflow-y: auto;
      overscroll-behavior: contain;
      z-index: 60;
      transform: translateY(100%);
      transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .projects-layout.has-active-project .projects-detail {
      transform: translateY(0);
    }

    .detail-body {
      flex-direction: column;
      gap: 2rem;
    }

    .detail-name {
      font-size: 2.5rem;
    }
  }

  .mobile-close-btn {
    display: none;
  }

  @media (max-width: 900px) {
    .mobile-close-btn {
      display: flex;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 3rem;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      cursor: pointer;
      z-index: 10;
    }
    .drag-handle {
      width: 40px;
      height: 4px;
      background: var(--text-muted);
      border-radius: 4px;
    }
  }`;

content = content.replace(oldMobileCSS, newMobileCSS);

fs.writeFileSync('Projects.astro', content);
