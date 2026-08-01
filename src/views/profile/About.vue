<template>
  <div class="page">
    <van-nav-bar :title="$t('about.title')" left-arrow @click-left="$router.back()" />

    <div class="card intro">
      <h2 class="h">{{ $t('about.title') }}</h2>
      <p class="p">{{ $t('about.intro') }}</p>
    </div>

    <van-cell-group inset class="group">
      <van-cell :title="$t('about.contact_title')" is-link @click="copyEmail">
        <template #label>
          <span class="muted">{{ contactEmail }}</span>
        </template>
        <template #right-icon>
          <van-icon name="description" class="cell-icon" />
        </template>
      </van-cell>
      <van-cell :title="$t('about.website_label')" is-link @click="openWebsite">
        <template #label>
          <span class="muted">{{ websiteDisplay }}</span>
        </template>
      </van-cell>
      <van-cell :title="$t('about.app_version_label')" :value="localVersion" />
      <van-cell
        v-if="serverLatestVersion"
        :title="$t('about.server_version_label')"
        :value="serverLatestVersion"
      />
    </van-cell-group>

    <div class="actions">
      <van-button type="primary" block round :loading="checking" @click="checkUpdate">
        {{ checking ? $t('about.checking') : $t('about.check_update') }}
      </van-button>
    </div>

    <van-dialog
      v-model:show="updateDialog"
      :title="$t('about.update_available', { version: serverLatestVersion || '' })"
      show-cancel-button
      :confirm-button-text="$t('about.update_now')"
      :cancel-button-text="$t('common.cancel')"
      @confirm="onConfirmUpdate"
    >
      <p class="dialog-body">{{ $t('about.update_hint') }}</p>
    </van-dialog>
  </div>
</template>

<script>
import { showToast } from 'vant'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { authApi } from '@/api'
import { APP_BUILD_VERSION, isRemoteVersionNewer } from '@/constants/appVersion'

const DEFAULT_DOWNLOAD = 'https://www.quantdinger.com/download/app.apk'
const WEBSITE = 'https://www.quantdinger.com'
const CONTACT_EMAIL = 'support@quantdinger.com'

export default {
  name: 'About',

  data() {
    return {
      localVersion: APP_BUILD_VERSION,
      serverLatestVersion: '',
      downloadUrl: DEFAULT_DOWNLOAD,
      checking: false,
      updateDialog: false
    }
  },

  computed: {
    contactEmail() {
      return CONTACT_EMAIL
    },
    websiteDisplay() {
      return 'www.quantdinger.com'
    }
  },

  mounted() {
    this.prefetchVersion()
  },

  methods: {
    async prefetchVersion() {
      try {
        const res = await authApi.getSecurityConfig()
        if (res.code === 1 && res.data) {
          const d = res.data
          this.serverLatestVersion = String(
            d.mobile_app_latest_version ?? d.mobileAppLatestVersion ?? ''
          ).trim()
          const u = String(d.mobile_app_download_url ?? d.mobileAppDownloadUrl ?? '').trim()
          if (u) this.downloadUrl = u
        }
      } catch (e) {
        console.warn('About prefetch version:', e)
      }
    },

    async copyEmail() {
      try {
        await navigator.clipboard.writeText(CONTACT_EMAIL)
        showToast({ message: this.$t('common.copied'), type: 'success' })
      } catch {
        showToast({ message: CONTACT_EMAIL, type: 'success' })
      }
    },

    async openWebsite() {
      try {
        if (Capacitor.isNativePlatform()) {
          await Browser.open({ url: WEBSITE, presentationStyle: 'fullscreen' })
        } else {
          window.open(WEBSITE, '_blank', 'noopener,noreferrer')
        }
      } catch (e) {
        console.error(e)
        window.open(WEBSITE, '_blank', 'noopener,noreferrer')
      }
    },

    async checkUpdate() {
      this.checking = true
      try {
        const res = await authApi.getSecurityConfig()
        if (res.code !== 1 || !res.data) {
          showToast({ message: this.$t('about.fetch_config_fail'), type: 'fail' })
          return
        }
        const d = res.data
        const latest = String(d.mobile_app_latest_version ?? d.mobileAppLatestVersion ?? '').trim()
        const u = String(d.mobile_app_download_url ?? d.mobileAppDownloadUrl ?? '').trim()
        if (u) this.downloadUrl = u || DEFAULT_DOWNLOAD
        this.serverLatestVersion = latest

        if (!latest) {
          showToast({ message: this.$t('about.up_to_date'), type: 'success' })
          return
        }
        if (isRemoteVersionNewer(latest, this.localVersion)) {
          this.updateDialog = true
        } else {
          showToast({ message: this.$t('about.up_to_date'), type: 'success' })
        }
      } catch (e) {
        console.error(e)
        showToast({ message: this.$t('about.fetch_config_fail'), type: 'fail' })
      } finally {
        this.checking = false
      }
    },

    async onConfirmUpdate() {
      const url = this.downloadUrl || DEFAULT_DOWNLOAD
      try {
        if (Capacitor.isNativePlatform()) {
          await Browser.open({ url, presentationStyle: 'fullscreen' })
        } else {
          window.open(url, '_blank', 'noopener,noreferrer')
        }
      } catch (e) {
        console.error(e)
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding-bottom: 32px;
}

.card.intro {
  margin: 16px var(--page-gutter);
  padding: 18px 16px;
  border-radius: 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
}

.h {
  margin: 0 0 10px;
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
}

.p {
  margin: 0;
  font-size: 13px;
  line-height: 1.65;
  color: var(--text-2);
}

.group {
  margin-top: 8px;
}

.muted {
  color: var(--text-3);
  font-size: 12px;
}

.cell-icon {
  color: var(--text-3);
  font-size: 18px;
}

.actions {
  margin: 20px var(--page-gutter) 0;
}

.dialog-body {
  margin: 12px 16px 16px;
  font-size: 13px;
  line-height: 1.55;
  color: var(--text-2);
}

:deep(.van-nav-bar) {
  background: transparent;
}
:deep(.van-nav-bar .van-nav-bar__title),
:deep(.van-nav-bar .van-icon) {
  color: var(--text);
}
:deep(.van-cell-group--inset) {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
}
:deep(.van-cell) {
  background: transparent;
  color: var(--text);
}
:deep(.van-cell__title) {
  color: var(--text);
}
:deep(.van-cell__value) {
  color: var(--text-2);
}
</style>
