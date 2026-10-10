/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import App from '../App';
import { OnboardingScreen } from '../src/screens/OnboardingScreen';

test('renders App correctly with onboarding', async () => {
  let root: any;
  await act(async () => {
    root = ReactTestRenderer.create(<App />);
  });
  expect(root).toBeDefined();
});

test('renders OnboardingScreen correctly', async () => {
  let tree: any;
  await act(async () => {
    tree = ReactTestRenderer.create(<OnboardingScreen onComplete={() => {}} />);
  });
  expect(tree.toJSON()).toBeTruthy();
});
