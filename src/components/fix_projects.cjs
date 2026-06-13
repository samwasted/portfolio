const fs = require('fs');

let content = fs.readFileSync('Projects.astro', 'utf8');

// 1. Revert HTML: remove the top-show-less button
content = content.replace(
  /<button id="mobile-top-show-less"[^>]*>[\s\S]*?<\/button>/,
  ''
);

// 2. Revert read-more logic in JS
const newReadMoreLogic = `      newBtn.addEventListener('click', function(this: HTMLButtonElement) {
        const isExpanded = this.getAttribute('aria-expanded') === 'true';
        this.setAttribute('aria-expanded', (!isExpanded).toString());
        readMoreContent.classList.toggle('expanded');
        this.innerHTML = !isExpanded ? 'Show Less <span class="read-more-icon">-</span>' : 'Read More <span class="read-more-icon">+</span>';
      });
    }`;

content = content.replace(
  /newBtn\.addEventListener\('click', function\(this: HTMLButtonElement\) \{[\s\S]*?\}\);\n    \}/,
  newReadMoreLogic
);

// 3. Remove Top Show Less Logic (Mobile) block
content = content.replace(
  /\/\/ Top Show Less Logic \(Mobile\)[\s\S]*?\}\);\n    \}/,
  ''
);

// 4. Update the drag physics logic to use the height shrinking method
const dragPhysicsRegex = /\/\/ Advanced drag physics for resizing\/closing[\s\S]*?if \(\!isDragging \|\| \!detailPane\) return;\n        isDragging = false;[\s\S]*?\}\n      \}\);\n    \}/;

const newDragPhysics = `// Advanced drag physics for resizing/closing
      let startY = 0;
      let startHeight = 0;
      let isDragging = false;
      const detailPane = document.getElementById('projects-detail');

      newCloseBtn.addEventListener('touchstart', (e: Event) => {
        const touchEvent = e as TouchEvent;
        startY = touchEvent.touches[0].clientY;
        if (!detailPane) return;
        startHeight = detailPane.offsetHeight;
        isDragging = true;
        detailPane.classList.add('is-dragging');
      }, { passive: true });

      newCloseBtn.addEventListener('touchmove', (e: Event) => {
        if (!isDragging || !detailPane) return;
        const touchEvent = e as TouchEvent;
        const currentY = touchEvent.touches[0].clientY;
        const deltaY = currentY - startY; // positive = dragging down
        
        const newHeight = startHeight - deltaY;
        detailPane.style.height = \`\${newHeight}px\`;
      }, { passive: true });

      newCloseBtn.addEventListener('touchend', (e: Event) => {
        if (!isDragging || !detailPane) return;
        isDragging = false;
        detailPane.classList.remove('is-dragging');
        
        const finalHeight = detailPane.offsetHeight;
        detailPane.style.height = ''; // Let CSS take over
        
        const windowHeight = window.innerHeight;
        const vh60 = windowHeight * 0.6;
        const vh85 = windowHeight * 0.85;
        
        if (finalHeight < vh60 * 0.8) {
          // Dragged down significantly below 60% -> Close
          if (layout) layout.classList.remove('has-active-project');
          cards.forEach(c => c.classList.remove('active'));
          detailPane.classList.remove('expanded-pane');
        } else if (finalHeight > (vh60 + (vh85 - vh60) * 0.25)) {
          // Dragged up towards 85% -> Snap to 85%
          detailPane.classList.add('expanded-pane');
        } else {
          // Snap back to 60%
          detailPane.classList.remove('expanded-pane');
        }
      });
    }`;

content = content.replace(dragPhysicsRegex, newDragPhysics);

// 5. Update CSS logic
content = content.replace(
  /\.projects-detail\.expanded-pane \{\n\s*height: 85dvh;\n\s*\}/,
  `.projects-detail.expanded-pane {
      height: 85dvh;
    }`
);

// We need to make sure the base project detail uses transform for slide and height for resize
const cssBlockToReplace = `.projects-detail {
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
      z-index: 250;
      transform: translateY(100%);
      transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .projects-detail.expanded-pane {
      height: 85dvh;
    }

    .projects-detail.is-dragging {
      transition: none;
    }

    .projects-layout.has-active-project .projects-detail {
      transform: translateY(0);
    }`;

const newCssBlock = `.projects-detail {
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
      z-index: 250;
      transform: translateY(100%);
      transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), height 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .projects-detail.expanded-pane {
      height: 85dvh;
    }

    .projects-detail.is-dragging {
      transition: none !important;
    }

    .projects-layout.has-active-project .projects-detail {
      transform: translateY(0);
    }`;

content = content.replace(cssBlockToReplace, newCssBlock);

// 6. Clean up stray `.mobile-top-show-less` css
content = content.replace(/\.mobile-top-show-less\s*\{\s*display:\s*none;\s*\}/g, '');
content = content.replace(/\.mobile-top-show-less\s*\{[\s\S]*?transition:[\s\S]*?\}\s*\.projects-detail\.expanded-pane\s*\.mobile-top-show-less\s*\{[\s\S]*?\}/, '');

fs.writeFileSync('Projects.astro', content);
