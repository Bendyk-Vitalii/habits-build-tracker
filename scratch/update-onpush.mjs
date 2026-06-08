import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const appDir = path.join(__dirname, '../apps/web/src/app');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      walkDir(dirPath, callback);
    } else if (f.endsWith('.component.ts')) {
      callback(dirPath);
    }
  });
}

walkDir(appDir, (filePath) => {
  let content = fs.readFileSync(filePath, 'utf-8');

  // Skip if already OnPush
  if (!content.includes('ChangeDetectionStrategy.OnPush')) {
    // 1. Add ChangeDetectionStrategy to @angular/core import
    if (content.includes('@angular/core') && !content.includes('ChangeDetectionStrategy')) {
      content = content.replace(/import\s+{([^}]*)}\s+from\s+['"]@angular\/core['"];/, (match, group) => {
        return `import { ${group.trim()}, ChangeDetectionStrategy } from '@angular/core';`;
      });
    }

    // 2. Add changeDetection: ChangeDetectionStrategy.OnPush, to @Component
    content = content.replace(/@Component\(\{([\s\S]*?)\}\)/, (match, group) => {
      // Ensure we insert it right after selector or standalone to keep formatting somewhat nice
      // A simple append before the closing } works
      const inner = group.trimEnd();
      return `@Component({\n  changeDetection: ChangeDetectionStrategy.OnPush,\n${inner}\n})`;
    });
  }
  
  fs.writeFileSync(filePath, content, 'utf-8');
});

console.log('Added OnPush to components.');

// Now fix the specific unused imports
const removeStr = (file, strToReplace, replacement = '') => {
  const p = path.join(__dirname, '../', file);
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf-8');
    c = c.replace(strToReplace, replacement);
    fs.writeFileSync(p, c, 'utf-8');
  }
};

removeStr('apps/web/src/app/core/services/activity.service.ts', '  deleteDoc,\n');
removeStr('apps/web/src/app/features/activities/activity-detail.component.ts', "import { StreakCounterComponent } from '../../shared/components/streak-counter/streak-counter.component';\n");
removeStr('apps/web/src/app/features/activities/activity-detail.component.ts', "import { ProgressRingComponent } from '../../shared/components/progress-ring/progress-ring.component';\n");
removeStr('apps/web/src/app/features/dashboard/components/today-overview/today-overview.component.ts', "import { StreakCounterComponent } from '../../../../shared/components/streak-counter/streak-counter.component';\n");
removeStr('apps/web/src/app/features/dashboard/dashboard.component.ts', "Activity, ");
removeStr('apps/web/src/app/features/progress/progress.component.ts', "import { Activity, Session } from '@habits-tracker/shared';\n");
removeStr('apps/web/src/app/features/progress/progress.component.ts', " computed");
removeStr('apps/web/src/app/features/progress/progress.component.ts', ", ChartType ");
removeStr('apps/web/src/app/features/timer/timer.component.ts', "Activity, ");

console.log('Removed dead code.');
