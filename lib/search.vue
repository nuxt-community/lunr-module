<template>
  <component :is="tag" ref="lunr" class="lunr-search">
    <input
      :id="`lunr-search${elementId}`"
      v-model="searchText"
      type="text"
      class="lunr-input"
      :placeholder="placeholderText"
      aria-label="Search"
      aria-haspopup="true"
      :aria-expanded="showResults"
      autocomplete="off"
      spellcheck="false"
      @keyup.enter="keyEnter"
      @keyup.up="keyUp"
      @keyup.down="keyDown"
    >

    <ul
      v-show="showResults"
      ref="results"
      class="lunr-results"
      tabIndex="-1"
      :aria-labelledby="`lunr-search${elementId}`"
      @keyup.enter="keyEnter"
      @keydown.up.stop.prevent
      @keydown.down.stop.prevent
      @keyup.up.stop.prevent="keyUp"
      @keyup.down.stop.prevent="keyDown"
    >
      <li
        v-if="statusMsg"
        class="lunr-status"
      >
        {{ statusMsg }}
      </li>
      <li
        v-for="(result, index) in searchResults"
        :key="`search${elementId}-${result.ref}`"
        class="lunr-result"
        :tabIndex="100 + index"
        @click.prevent="closeResults"
      >
        <slot
          :result="result"
          :index="index"
          :max-score="maxScore"
          :meta="getResultMeta(result)"
        >
          <nuxt-link :to="result.ref" role="menuitem">
            {{ result.ref }}
            <span class="text-right">{{ result.score }}</span>
          </nuxt-link>
        </slot>
      </li>
    </ul>
  </component>
</template>

<script>
import lunr from 'lunr'
<% if (options.supportedLanguages) { %>
import lunrStemmer from 'lunr-languages/lunr.stemmer.support'
<%= options.supportedLanguages.map(language => `import ${language}LunrLanguage from 'lunr-languages/lunr.${language}'`).join('\n') %>

!lunr.stemmerSupport && lunrStemmer(lunr)
<%= options.supportedLanguages.map(language => `!lunr.${language} && ${language}LunrLanguage(lunr)`).join('\n') %>
<% } %>

const normalizeLanguage = locale => (locale || '').substr(0, 2).toLowerCase()

const statusMessages = JSON.parse(`<%= JSON.stringify(options.statusMessages, null, 2) %>`)

// cache previously loaded indexes
const indexCache = {}
<%
const validatedLanguages = ['', 'en']
  .concat(options.supportedLanguages, Object.keys(options.languageStemmerMap))
  .filter((lang, index, array) => index === array.findIndex(item => item === lang))
  .join(`', '`)
%>
export default {
  props: {
    id: {
      type: String,
      default: ''
    },
    tag: {
      type: String,
      default: 'div'
    },
    placeholder: {
      type: String,
      default: '<%= options.placeholderText %>'
    },
    lang: {
      type: String,
      default: '',
      validator: val => ['<%= validatedLanguages %>'].includes(val)
    },
    locale: {
      type: String,
      default: '',
      validator: val => ['<%= validatedLanguages %>'].includes(normalizeLanguage(val))
    }
  },
  data () {
    return {
      placeholderText: '',
      statusMsg: '',
      searchMeta: undefined,
      searchText: '',
      searchResults: [],
      resultsVisible: false
    }
  },
  computed: {
    elementId () {
      return this.id ? `-${this.id}` : ''
    },
    language () {
      if (this.lang) {
        return this.lang
      }

      if (this.locale) {
        return normalizeLanguage(this.locale)
      }

      return '<%= options.defaultLanguage %>'
    },
    showResults () {
      if (this.statusMsg) {
        return true
      }

      if (this.resultsVisible) {
        return true
      }

      return false
    },
    maxScore () {
      if (this.searchResults.length) {
        return Math.max.apply(null, this.searchResults.map(r => r.score))
      }

      return 0
    }
  },
  watch: {
    language (val) {
      this.searchIndex = undefined
      this.searchMeta = undefined
      this.searchResults = []

      this.setPlaceholderText()

      if (this.searchText) {
        this.search(this.searchText)
      }
    },
    searchText (val) {
      if (!val) {
        this.closeResults()
        return
      }

      clearTimeout(this.searchTimeout)
      this.searchTimeout = setTimeout(() => this.search(val), 200)
    },
    showResults (val) {
      if (val) {
        this.addBodyListener()
      } else {
        this.removeBodyListener()
      }
    },
    placeholder (val) {
      this.setPlaceholderText(val)
    }
  },
  created () {
    this.setPlaceholderText()
  },
  methods: {
    addBodyListener () {
      document.body.addEventListener('mousedown', this.bodyListener)
    },
    removeBodyListener () {
      document.body.removeEventListener('mousedown', this.bodyListener)
    },
    bodyListener (event) {
      if (this.$refs.lunr && !this.$refs.lunr.contains(event.target)) {
        this.resultsVisible = false
      }
    },
    closeResults () {
      this.searchText = ''
      this.resultsVisible = false
      this.removeBodyListener()
      this.clearStatus()
    },
    openResults () {
      this.resultsVisible = true
    },
    async loadIndex () {
      if (this.loadingIndex) {
        return this.waitLoadingComplete()
      }

      this.loadingIndex = true

      if (indexCache[this.language]) {
        this.searchIndex = indexCache[this.language].index
        this.searchMeta = indexCache[this.language].meta
        this.loadingIndex = false
        return
      }

      this.setStatus('fetching')
      const url = `<%= `${options.publicPath}${options.path}` %>/${this.language}.json`
      const searchJson = await fetch(url).then((res) => {
        if (res.status === 200) {
          return res.json()
        }

        this.setStatus(`Search index: ${res.status} ${res.statusText}`)
      })

      if (!searchJson) {
        this.loadingIndex = false
        return false
      }

      this.setStatus('loading')
      this.searchMeta = searchJson.metas || undefined
      this.searchIndex = lunr.Index.load(searchJson)

      indexCache[this.language] = {
        meta: this.searchMeta,
        index: this.searchIndex
      }

      this.$emit('loaded', {
        lang: this.language,
        json: searchJson
      })

      this.clearStatus()
      this.loadingIndex = false
      return true
    },
    waitLoadingComplete () {
      return new Promise((resolve) => {
        let iter = 0

        const resolveWhenLoaded = () => {
          if (!this.loadingIndex) {
            resolve(true)
            return
          }

          // timeout after 3s
          if (iter >= 15) {
            resolve(false)
          }

          setTimeout(resolveWhenLoaded, 50)
          iter++
        }

        resolveWhenLoaded()
      })
    },
    async search (txt) {
      if (!this.searchIndex) {
        const indexLoaded = await this.loadIndex()

        if (!indexLoaded) {
          return
        }
      }

      this.setStatus('searching')

      this.searchResults = this.searchIndex.search(txt)

      if (!this.searchResults || !this.searchResults.length) {
        this.setStatus('noresults')
      } else {
        this.clearStatus()
      }

      this.openResults()
    },
    clearStatus () {
      this.statusMsg = ''
    },
    setStatus (id) {
      this.statusMsg = this.getStatusText(id)
    },
    getStatusText (statusId) {
      <% if (options.useI18N) { %>
      try {
        const translationKey = `lunr-module.${statusId}`
        const hasTranslation = this.$te(translationKey)
        if (hasTranslation) {
          return this.$t(translationKey)
        }
      } catch (error) {}
      <% } %>

      if (statusMessages[statusId]) {
        return statusMessages[statusId]
      }

      return statusId
    },
    setPlaceholderText (text) {
      if (text) {
        this.placeholderText = text
      }
      <% if (options.useI18N) { %>
      const translationKey = 'lunr-module.placeholderText'
      const hasTranslation = this.$te(translationKey)
      if (hasTranslation) {
        this.placeholderText = this.$t(translationKey)
      }
      <% } %>
    },
    getResultMeta ({ ref }) {
      if (!this.searchMeta || !this.searchMeta[ref]) {
        return
      }

      return this.searchMeta[ref]
    },
    keyEnter () {
      const el = this.$refs.results.querySelector(':focus')
      if (el) {
        el.querySelector('a').click()
        this.closeResults()
      }
    },
    keyUp () {
      if (!this.showResults) {
        return
      }

      const el = this.$refs.results.querySelector(':focus')
      if (!el) {
        this.$refs.results.querySelector(':last-child').focus()
      } else if (el.previousSibling && el.previousSibling.focus) {
        el.previousSibling.focus()
      }
    },
    keyDown () {
      if (!this.showResults) {
        return
      }

      const el = this.$refs.results.querySelector(':focus')
      if (!el) {
        this.$refs.results.querySelector(':first-child').focus()
      } else if (el.nextSibling) {
        el.nextSibling.focus()
      }
    }
  }
}
</script>
<% if (options.css) { %>
<style>
.lunr-search {
  position: relative;
  display: inline-block;
  font-size: 1rem;
}

.lunr-input {
  display: inline-block;
  border: 1px solid #eee;
  border-radius: 5px;
  line-height: 2rem;
  padding: 0 0.5em 0 2em;
  outline: none;
  transition: all .2s ease;
  background: #fff url(icon-search.svg) 0.6em 0.5em no-repeat;
  background-size: 1rem;
}

.lunr-input:focus {
  border-color: #ddd;
}

.lunr-results {
  display: block;
  position: absolute;
  width: 20rem;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 5px;
  margin: .5rem 0px 0px;
  padding: 0.3rem;
  list-style-type: none;
  font-size: 1.1em;
}

.lunr-result {
  cursor: pointer;
  line-height: 1.6em;
}

.lunr-result:hover,
.lunr-result:focus {
  background-color: #eee;
}

.lunr-result a {
  position: relative;
  display: inline-block;
  width: 100%;
}

.lunr-result .text-right {
  position: absolute;
  right: 0;
}

.lunr-status {
  font-style: italic;
}
</style>
<% } %>
