<template>
  <component :is="tag" ref="lunr" class="lunr-search">
    <input
      :id="`search-${id}`"
      class="lunr-input"
      v-model="searchText" type="text"
      :placeholder="placeholder"
      aria-label="Search"
      aria-haspopup="true"
      aria-expanded="showResults"
      autocomplete="off"
      spellcheck="false"
      @focus="hasFocus = true"
      @blur="hasFocus = true"
      @keyup.enter="keyEnter"
      @keyup.up="keyUp"
      @keyup.down="keyDown"
    />

    <ul
      class="lunr-results"
      v-show="showResults"
      tabIndex="-1"
      ref="results"
      :aria-labelledby="`search-${id}`"
      @keyup.enter="keyEnter"
      @keydown.up.stop.prevent
      @keydown.down.stop.prevent
      @keyup.up.stop.prevent="keyUp"
      @keyup.down.stop.prevent="keyDown"
    >
      <li v-if="status" class="lunr-status">{{ status }}</li>
      <li
        v-for="(result, index) in searchResults"
        :key="`search-${id}-${result.ref}`"
        class="lunr-result"
        :tabIndex="100 + index"
        @click.prevent="closeResults"
      >
        <slot
          v-bind:result="result"
          v-bind:index="index"
          v-bind:max-score="maxScore"
          v-bind:meta="getResultMeta(result)"
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
<%= options.supportedLanguages.map(language => `import ${language}LunrLanguage from 'lunr-languages/lunr.${language}'`) %>

!lunr.stemmerSupport && lunrStemmer(lunr)
<%= options.supportedLanguages.map(language => `!lunr['${language}'] && ${language}LunrLanguage(lunr)`) %>
<% } %>

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
      default: 'search'
    },
    lang: {
      type: String,
      default: 'en'
    }
  },
  data() {
    return {
      hasFocus: false,
      status: '',
      searchMeta: undefined,
      searchText: '',
      searchResults: [],
      resultsVisible: false
    }
  },
  computed: {
    showResults() {
      return !!(this.status || (this.resultsVisible && this.searchResults.length))
    },
    maxScore() {
      return Math.max.apply(null, this.searchResults.map(r => r.score))
    }
  },
  created() {
    this.searchIndexes = {}
  },
  watch: {
    lang(val) {
      this.searchIndex = this.searchIndexes[val]

      if (this.searchText) {
        this.search(this.searchText)
      }
    },
    searchText(val) {
      if (!val) {
        this.closeResults()
        return
      }

      clearTimeout(this.searchTimeout)
      this.searchTimeout = setTimeout(() => this.search(val), 200)
    },
    showResults(val) {
      if (val) {
        this.addBodyListener()
      } else {
        this.removeBodyListener()
      }
    }
  },
  methods: {
    addBodyListener() {
      document.body.addEventListener('mousedown', this.bodyListener)
    },
    removeBodyListener() {
      document.body.removeEventListener('mousedown', this.bodyListener)
    },
    bodyListener(event) {
      if (!this.$refs.lunr.contains(event.target)) {
        this.resultsVisible = false
      }
    },
    closeResults() {
      this.searchText = ''
      this.resultsVisible = false
      this.removeBodyListener()
    },
    openResults() {
      this.resultsVisible = true
    },
    async loadIndex() {
      if (this.searchIndex || this.loadingIndex) {
        return true
      }

      this.loadingIndex = true

      this.status = 'fetching search index'
      const url = `<%= `${options.publicPath}${options.path}` %>/${this.lang}.json`
      const searchJson = await fetch(url).then((res) => {
        if (res.status === 200) {
          return res.json()
        }

        this.status = `${res.status} ${res.statusText}`
      })

      if (!searchJson) {
        return false
      }

      this.searchMeta = searchJson.metas || undefined

      this.status = 'loading search index'
      this.searchIndex = lunr.Index.load(searchJson)
      this.searchIndexes[this.locale] = this.searchIndex

      this.$emit('loaded', {
        lang: this.lang,
        json: searchJson
      })

      this.status = ''
      this.loadingIndex = false
      return true
    },
    async search(txt) {
      if (!await this.loadIndex()) {
        return
      }

      this.searchResults = this.searchIndex.search(txt)

      this.openResults()
    },
    getResultMeta({ ref }) {
      if (!this.searchMeta || !this.searchMeta[ref]) {
        return
      }

      return this.searchMeta[ref]
    },
    keyEnter() {
      const el = this.$refs.results.querySelector(':focus')
      if (el) {
        el.querySelector('a').click()
        this.closeResults()
      }
    },
    keyUp() {
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
    keyDown() {
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
  background: #fff url(search.svg) 0.6em 0.5em no-repeat;
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
