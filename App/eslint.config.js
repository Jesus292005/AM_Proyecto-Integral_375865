// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

function mensajePush() {
  return 'D78: usa router.navigate (o <Link>), que no apila la misma pantalla dos veces; para cambiar un filtro de la pantalla actual usa router.setParams.';
}

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // D54: prohibido `any`
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    // D78: nunca se apila la misma pantalla; se navega con `router.navigate` o `<Link>`.
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'router', property: 'push', message: mensajePush() },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[property.name='push'][object.callee.name='useRouter']",
          message: mensajePush(),
        },
        {
          selector:
            "VariableDeclarator[init.callee.name='useRouter'] > ObjectPattern > Property[key.name='push']",
          message: mensajePush(),
        },
        {
          selector: "JSXOpeningElement[name.name='Link'] > JSXAttribute[name.name='push']",
          message: mensajePush(),
        },
      ],
    },
  },
]);
