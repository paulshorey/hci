import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createMultimediaCMS } from '@multimedia/cms'
import { required } from '@multimedia/cms/lib/env'

export default createMultimediaCMS({
  directory: path.dirname(fileURLToPath(import.meta.url)),
  databaseURL: required('DB_HCI_URL'),
  title: 'Human / Computer',
  navigationComponents: ['/components/EditorialLinks#EditorialLinks'],
  bundleLibraryHelp: '/components/EditorialLinks#BundleLibraryHelp',
})
