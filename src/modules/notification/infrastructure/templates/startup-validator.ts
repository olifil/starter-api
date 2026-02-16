import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TemplateStartupValidator implements OnModuleInit {
  private readonly logger = new Logger(TemplateStartupValidator.name);

  onModuleInit(): void {
    this.validateTranslationFiles();
    this.validateHandlebarsTemplates();
  }

  private validateTranslationFiles(): void {
    const i18nDir = path.join(process.cwd(), 'src', 'modules', 'notification', 'resources', 'i18n');
    if (!fs.existsSync(i18nDir)) {
      this.logger.warn('i18n directory not found, skipping validation');
      return;
    }

    const languages = fs
      .readdirSync(i18nDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    if (languages.length === 0) {
      this.logger.warn('No language directories found in i18n');
      return;
    }

    // Collecter les clés par langue
    const keysByLang: Record<string, Set<string>> = {};

    for (const lang of languages) {
      const filePath = path.join(i18nDir, lang, 'notification.yaml');
      if (!fs.existsSync(filePath)) {
        this.logger.warn(`notification.yaml missing for language '${lang}'`);
        continue;
      }

      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        // Validation basique : le fichier est parsable comme YAML
        // nestjs-i18n s'occupe du parsing réel
        if (!content.trim()) {
          this.logger.warn(`notification.yaml for '${lang}' is empty`);
          continue;
        }
        const keys = this.extractKeys(content);
        keysByLang[lang] = keys;
      } catch (error) {
        const err = error as Error;
        this.logger.error(`Failed to parse notification.yaml for '${lang}': ${err.message}`);
      }
    }

    // Vérifier la cohérence des clés entre langues
    const allLangs = Object.keys(keysByLang);
    if (allLangs.length < 2) return;

    const referenceKeys = keysByLang[allLangs[0]];
    for (let i = 1; i < allLangs.length; i++) {
      const lang = allLangs[i];
      const langKeys = keysByLang[lang];

      for (const key of referenceKeys) {
        if (!langKeys.has(key)) {
          this.logger.warn(
            `Translation key '${key}' missing in '${lang}' (present in '${allLangs[0]}')`,
          );
        }
      }

      for (const key of langKeys) {
        if (!referenceKeys.has(key)) {
          this.logger.warn(`Translation key '${key}' in '${lang}' but missing in '${allLangs[0]}'`);
        }
      }
    }

    this.logger.log(`Translation validation complete: ${allLangs.length} languages checked`);
  }

  private validateHandlebarsTemplates(): void {
    const templatesDir = path.join(
      process.cwd(),
      'src',
      'modules',
      'notification',
      'resources',
      'templates',
      'email',
    );
    if (!fs.existsSync(templatesDir)) {
      this.logger.warn('Email templates directory not found');
      return;
    }

    const hbsFiles = this.findHbsFiles(templatesDir);
    let valid = 0;

    for (const file of hbsFiles) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        // Vérification basique que les accolades sont équilibrées
        const openCount = (content.match(/\{\{/g) || []).length;
        const closeCount = (content.match(/\}\}/g) || []).length;
        if (openCount !== closeCount) {
          this.logger.warn(`Unbalanced Handlebars tags in ${path.relative(process.cwd(), file)}`);
        } else {
          valid++;
        }
      } catch (error) {
        const err = error as Error;
        this.logger.error(`Failed to read template ${file}: ${err.message}`);
      }
    }

    this.logger.log(`Handlebars validation complete: ${valid}/${hbsFiles.length} templates valid`);
  }

  private extractKeys(yamlContent: string): Set<string> {
    const keys = new Set<string>();
    const lines = yamlContent.split('\n');
    const stack: string[] = [];
    let prevIndent = -1;

    for (const line of lines) {
      if (!line.trim() || line.trim().startsWith('#')) continue;
      const match = line.match(/^(\s*)(\S+):/);
      if (!match) continue;

      const indent = match[1].length;
      const key = match[2];

      if (indent <= prevIndent) {
        const levels = Math.floor((prevIndent - indent) / 2) + 1;
        for (let i = 0; i < levels && stack.length > 0; i++) {
          stack.pop();
        }
      }

      stack.push(key);
      keys.add(stack.join('.'));
      prevIndent = indent;
    }

    return keys;
  }

  private findHbsFiles(dir: string): string[] {
    const results: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...this.findHbsFiles(fullPath));
      } else if (entry.name.endsWith('.hbs')) {
        results.push(fullPath);
      }
    }

    return results;
  }
}
