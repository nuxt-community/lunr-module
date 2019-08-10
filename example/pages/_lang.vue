<template>
  <div class="body">
    <h1>Moonwalkers</h1>
    <lunr-search :lang="lang" class="search">
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
  computed: {
    lang () {
      return this.$route.params.lang
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
