<template>
  <div class="nav-item">
    <DropdownLink :item="{
				text: 'Versions',
				items: tags,
        type: 'links'
			}"/>
  </div>
</template>

<script>
import ky from "ky";
import DropdownLink from "../theme/DropdownLink.vue";
import { resolveNavLinkItem } from "../theme/util";
import NavLink from "../theme/NavLink.vue";

export default {
  name: "VersionSelector",
  data() {
    return {
      tags: [],
      location:
        typeof window !== "undefined" && window !== null
          ? window.location.origin
          : ""
    };
  },
  components: {
    DropdownLink,
    NavLink
  },
  mounted() {
    if (typeof window !== "undefined" && window !== null) {
      ky.get(`${window.location.origin}/releases.json`).then(response => {
        response.json().then(releases => {
          releases.tags.forEach(tag => {
            this.tags.push({
              text: tag.name,
              type: "link",
              link: `${window.location.origin}/${tag.name}`
            });
          });
        });
      });
    }
  }
};
</script>

<style>
</style>
