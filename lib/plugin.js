import Vue from 'vue'
import Search from './search.vue'

Vue.component('<%= typeof options.globalComponent === 'string' ? options.globalComponent : 'lunr-search' %>', Search)
