// The dog drawing, shared by the reminder window and the Settings previews.
// One SVG serves every skin: dog-art.css picks colours and which parts show
// based on the wrapper's data-skin attribute.
window.DogArt = {
  SKINS: [
    { id: 'beagle', name: 'Buddy', breed: 'Beagle', voice: 'dog' },
    { id: 'shiba', name: 'Mochi', breed: 'Shiba Inu', voice: 'dog' },
    { id: 'corgi', name: 'Biscuit', breed: 'Corgi', voice: 'dog' },
    { id: 'husky', name: 'Luna', breed: 'Husky', voice: 'dog' },
    { id: 'cat', name: 'Whiskers', breed: 'Cat (traitor)', voice: 'cat' },
  ],

  skin(id) {
    return this.SKINS.find((s) => s.id === id) || this.SKINS[0];
  },

  svg: `
<svg class="dog-svg" viewBox="0 0 220 240" aria-hidden="true">
  <g class="dog-body">
    <path class="tail tail-wag" d="M172 186 C 196 170, 204 146, 192 118"/>
    <path class="tail tail-curl" d="M168 192 C 206 190, 216 140, 188 134 C 170 130, 168 152, 184 156"/>
    <path class="tail tail-cat" d="M170 194 C 212 182, 186 132, 204 98"/>
    <ellipse class="fur-body" cx="158" cy="234" rx="96" ry="62"/>
    <ellipse class="cream" cx="114" cy="228" rx="42" ry="36"/>
    <path class="collar" d="M52 168 Q108 204 164 168"/>
    <circle class="tag" cx="110" cy="192" r="8"/>

    <g class="head interactive">
      <g class="antic">
        <g class="head-inner">
          <g class="ears-pointy">
            <g class="ear ear-l">
              <path class="fur" d="M46 98 Q30 44 42 20 Q72 34 98 62 Z"/>
              <path class="ear-inner" d="M54 84 Q46 50 50 36 Q68 46 86 64 Z"/>
            </g>
            <g class="ear ear-r">
              <path class="fur" d="M164 98 Q180 44 168 20 Q138 34 112 62 Z"/>
              <path class="ear-inner" d="M156 84 Q164 50 160 36 Q142 46 124 64 Z"/>
            </g>
          </g>

          <ellipse class="fur" cx="105" cy="116" rx="66" ry="58"/>
          <ellipse class="rage" cx="105" cy="116" rx="66" ry="58"/>
          <ellipse class="blaze" cx="105" cy="84" rx="10" ry="18"/>
          <path class="cat-stripes" d="M91 64 Q95 75 91 86 M105 60 V84 M119 64 Q115 75 119 86"/>
          <g class="husky-mask">
            <ellipse cx="80" cy="95" rx="11" ry="6"/>
            <ellipse cx="130" cy="95" rx="11" ry="6"/>
            <path d="M48 128 Q58 176 105 174 Q152 176 162 128 Q138 118 105 122 Q72 118 48 128 Z"/>
          </g>

          <g class="ears-floppy">
            <path class="ear ear-l ear-dark" d="M52 70 C28 68 12 110 24 150 C32 170 58 160 62 132 C66 108 72 84 52 70 Z"/>
            <path class="ear ear-r ear-dark" d="M158 70 C182 68 198 110 186 150 C178 170 152 160 148 132 C144 108 138 84 158 70 Z"/>
          </g>

          <ellipse class="cream muzzle" cx="105" cy="146" rx="37" ry="27"/>
          <ellipse class="cheek" cx="64" cy="142" rx="11" ry="7"/>
          <ellipse class="cheek" cx="146" cy="142" rx="11" ry="7"/>

          <g class="eyes-normal">
            <circle class="eye" cx="78" cy="114" r="10"/>
            <circle class="eye" cx="132" cy="114" r="10"/>
            <circle class="pupil-round" cx="78" cy="114" r="5"/>
            <circle class="pupil-round" cx="132" cy="114" r="5"/>
            <ellipse class="pupil-slit" cx="78" cy="114" rx="2.6" ry="7.5"/>
            <ellipse class="pupil-slit" cx="132" cy="114" rx="2.6" ry="7.5"/>
            <circle class="glint" cx="81.5" cy="110" r="3.6"/>
            <circle class="glint" cx="135.5" cy="110" r="3.6"/>
          </g>
          <path class="line brows brows-1" d="M66 99 L90 103 M144 99 L120 103"/>
          <path class="line brows brows-2" d="M62 95 L92 107 M148 95 L118 107"/>
          <g class="line eyes-happy">
            <path d="M67 117 Q78 103 89 117"/>
            <path d="M121 117 Q132 103 143 117"/>
          </g>
          <g class="eyes-angry">
            <circle class="eye" cx="79" cy="118" r="8"/>
            <circle class="eye" cx="131" cy="118" r="8"/>
            <path class="line" d="M62 99 L92 110 M148 99 L118 110"/>
          </g>

          <path class="nose" d="M94 131 Q105 124 116 131 Q114 142 105 144 Q96 142 94 131 Z"/>
          <ellipse class="glint nose-glint" cx="101" cy="130.5" rx="3.5" ry="2"/>

          <path class="line mouth-normal" d="M105 144 V150 M105 150 Q97 159 89 152 M105 150 Q113 159 121 152"/>
          <g class="mouth-happy">
            <path class="mouth-open" d="M86 151 Q105 182 124 151 Z"/>
            <path class="tongue" d="M96 162 Q105 158 114 162 Q114 175 105 176 Q96 175 96 162 Z"/>
          </g>
          <path class="mouth-open mouth-angry" d="M88 164 Q105 147 122 164 Q105 174 88 164 Z"/>
          <path class="whiskers" d="M68 146 L34 139 M68 153 L34 158 M142 146 L176 139 M142 153 L176 158"/>

          <text class="anger" x="148" y="66" font-size="28">💢</text>
          <text class="steam steam-l" x="14" y="80" font-size="24">💨</text>
          <text class="steam steam-r" x="172" y="70" font-size="24">💨</text>
        </g>
      </g>
    </g>

    <g class="paws">
      <g class="paw-l">
        <ellipse class="paw" cx="72" cy="226" rx="22" ry="14"/>
        <path class="paw-line" d="M64 221 v8 M72 220 v9 M80 221 v8"/>
      </g>
      <g class="paw-r">
        <ellipse class="paw" cx="140" cy="228" rx="22" ry="14"/>
        <path class="paw-line" d="M132 223 v8 M140 222 v9 M148 223 v8"/>
      </g>
    </g>
  </g>
</svg>`,
};
