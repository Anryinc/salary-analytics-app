// Conventional Commits: https://www.conventionalcommits.org/ru/v1.0.0/
// Примеры: "feat: перетаскивание границ грейдов на графике", "fix(binning): ...",
// "feat!: ..." или футер "BREAKING CHANGE:" — для ломающих изменений.
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // русские описания коммитов допустимы, регистр не навязываем
    'subject-case': [0],
  },
};
