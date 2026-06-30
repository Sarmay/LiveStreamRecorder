#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const fnosDir = path.join(repoRoot, 'fnos')
const manifestPath = path.join(fnosDir, 'manifest')
const composePath = path.join(fnosDir, 'app/docker/docker-compose.yaml')
const composeTemplatePath = path.join(fnosDir, 'app/docker/docker-compose.yaml.template')

function readArg (name, fallback = '') {
  const prefix = `--${name}=`
  const arg = process.argv.find(item => item.startsWith(prefix))
  return arg ? arg.slice(prefix.length) : fallback
}

function normalizeVersion (value) {
  return String(value || '1.0.0').trim().replace(/^v/i, '')
}

function normalizeImageName (value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._/-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

const version = normalizeVersion(readArg('version', process.env.VERSION))
const imageNamespace = normalizeImageName(readArg('image-namespace', process.env.IMAGE_NAMESPACE || 'ghcr.io/sarmay'))
const imagePrefix = normalizeImageName(readArg('image-prefix', process.env.IMAGE_PREFIX || 'livestreamrecorder'))
const backendImage = normalizeImageName(readArg('backend-image', process.env.BACKEND_IMAGE || `${imageNamespace}/${imagePrefix}-backend`))
const frontendImage = normalizeImageName(readArg('frontend-image', process.env.FRONTEND_IMAGE || `${imageNamespace}/${imagePrefix}-frontend`))

if (!/^\d+(?:\.\d+){0,2}(?:-[A-Za-z0-9._-]+)?$/.test(version)) {
  throw new Error(`Invalid fnOS version: ${version}`)
}

const manifest = fs.readFileSync(manifestPath, 'utf8')
const nextManifest = manifest.replace(/^version\s*=.*$/m, `version               = ${version}`)
fs.writeFileSync(manifestPath, nextManifest)

const composeTemplate = fs.readFileSync(composeTemplatePath, 'utf8')
const nextCompose = composeTemplate
  .replaceAll('__BACKEND_IMAGE__', `${backendImage}:${version}`)
  .replaceAll('__FRONTEND_IMAGE__', `${frontendImage}:${version}`)
fs.writeFileSync(composePath, nextCompose)

console.log(`Prepared fnOS package ${version}`)
console.log(`Backend image: ${backendImage}:${version}`)
console.log(`Frontend image: ${frontendImage}:${version}`)
