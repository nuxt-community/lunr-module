<template>
  <div class="body">
    <ul>
      <li v-for="(availableLocale) in availableLocales" :key="availableLocale">
        <nuxt-link :to="`/${availableLocale}`">
          {{ availableLocale }}
        </nuxt-link>
      </li>
    </ul>

    <h1>Moonwalkers ({{ this.$i18n.locale }})</h1>
    <lunr-search :lang="lang" :locale="locale" class="search">
      <template v-slot:default="{ result, index, maxScore, meta }">
        <article>
          <h2>{{ meta.name }} <small>score: {{ Math.round(100 * result.score / maxScore) }}%</small></h2>
          <p>{{ meta.body }}</p>
        </article>
      </template>
    </lunr-search>
  </div>
</template>

<script>
// import LunrSearch from '../.nuxt/lunr/search'

export default {
  components: {
    LunrSearch: () => import('../.nuxt/lunr/search')
  },
  head () {
    return {
      meta: [{ charset: 'utf-8' }]
    }
  },
  computed: {
    availableLocales () {
      return this.$i18n.locales.filter(i => i.code !== this.$i18n.locale)
    },
    lang () {
      const locale = this.$i18n.locale
      if (locale.length === 2) {
        return locale
      }

      return ''
    },
    locale () {
      const locale = this.$i18n.locale
      if (locale.length > 2) {
        return locale
      }

      return ''
    }
  }
}
</script>

<style>
.body {
  width: 600px;
  margin: 0 auto;
  color: #333;
  font-family: sans-serif;
}

ul li {
  float: left;
  list-style-type: none;
  margin: 0 1rem 0 0;
}

h1 {
  clear: both;
}
.search input {
  width: 100%;
}

.search ul,
.search li {
  list-style-type: none;
  margin: 0;
  padding: 0;
}

article h2 {
  text-transform: capitalize;
}

article h2 small {
  color: #aaa;
}

article {
  border-bottom: 1px solid #ddd;
}

article p {
  line-height: 1.4em;
}
</style>
