import assert from 'node:assert/strict';
import test from 'node:test';
import { passwordValidationMessage } from '../src/lib/passwordPolicy.js';

test('la création et la récupération exigent un mot de passe robuste', () => {
  assert.ok(passwordValidationMessage('court'));
  assert.ok(passwordValidationMessage('abcdefghijkl'));
  assert.ok(passwordValidationMessage('ABCDEFGHIJKL'));
  assert.ok(passwordValidationMessage('Abcdefghijkl'));
  assert.ok(passwordValidationMessage('Abcdefghijk1'));
  assert.equal(passwordValidationMessage('Abcdefghij1!'), '');
});
