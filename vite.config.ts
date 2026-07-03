import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 배포용 base 경로. 리포명이 jobseek 라고 가정.
// 사용자 리포명이 다르면 이 값을 수정하세요.
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES === 'true' ? '/Jobseek/' : '/',
});
