export function SunsetSkyline({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Ocean waves - bottom left, hand-drawn wobbly lines */}
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7">
        {/* Wave lines flowing along the coast */}
        <path d="M0 420 Q30 415, 60 418 Q90 421, 120 416 Q150 411, 180 414 Q210 417, 240 412 Q270 407, 300 410 Q330 413, 360 408" />
        <path d="M0 440 Q35 434, 70 437 Q105 440, 140 435 Q175 430, 210 433 Q245 436, 280 431 Q315 426, 350 429 Q385 432, 420 427" />
        <path d="M0 460 Q40 453, 80 456 Q120 459, 160 454 Q200 449, 240 452 Q280 455, 320 450 Q360 445, 400 448 Q440 451, 480 446" />
        <path d="M0 480 Q45 473, 90 476 Q135 479, 180 474 Q225 469, 270 472 Q315 475, 360 470 Q405 465, 450 468 Q495 471, 540 466" />
        <path d="M30 500 Q75 493, 120 496 Q165 499, 210 494 Q255 489, 300 492 Q345 495, 390 490 Q435 485, 480 488 Q525 491, 570 486 Q615 481, 660 484" />
      </g>

      {/* Coastline - diagonal from lower-left to upper-right, wobbly hand-drawn */}
      <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.8">
        <path d="M0 400 Q50 395, 100 385 Q150 375, 200 362 Q260 348, 320 335 Q380 322, 440 308 Q500 295, 560 280 Q620 266, 680 252 Q740 238, 800 225 Q860 212, 920 198 Q980 185, 1040 172 Q1100 158, 1160 145 Q1190 138, 1200 135" />
        {/* Beach edge - slightly offset parallel line */}
        <path d="M0 408 Q55 402, 110 391 Q165 380, 220 367 Q280 353, 340 340 Q400 327, 460 313 Q520 300, 580 285 Q640 271, 700 257 Q760 243, 820 230 Q880 217, 940 203 Q1000 190, 1060 177 Q1120 163, 1180 150 Q1200 144, 1200 142" />
      </g>

      {/* Street grid - the Sunset/Richmond blocks, slightly irregular */}
      <g stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.5">
        {/* Vertical avenues (N-S) - slightly wobbly */}
        <path d="M420 50 Q418 100, 420 150 Q422 200, 419 250 Q417 290, 416 305" />
        <path d="M480 50 Q479 100, 481 150 Q483 200, 480 250 Q478 285, 477 295" />
        <path d="M540 50 Q538 100, 540 150 Q542 200, 539 245 Q537 270, 536 280" />
        <path d="M600 50 Q599 100, 601 150 Q603 200, 600 240 Q598 260, 597 270" />
        <path d="M660 50 Q658 100, 660 150 Q662 200, 659 235 Q657 250, 656 258" />
        <path d="M720 50 Q719 100, 721 150 Q723 195, 720 225 Q718 240, 717 248" />
        <path d="M780 50 Q778 100, 780 150 Q782 190, 779 215 Q777 230, 776 238" />
        <path d="M840 50 Q839 100, 841 150 Q843 185, 840 205 Q838 218, 837 225" />
        <path d="M900 50 Q898 100, 900 150 Q902 178, 899 195 Q897 205, 896 212" />
        <path d="M960 50 Q959 100, 961 145 Q963 170, 960 185 Q958 195, 957 200" />
        <path d="M1020 50 Q1018 100, 1020 140 Q1022 160, 1019 175 Q1017 183, 1016 188" />
        <path d="M1080 50 Q1079 95, 1081 130 Q1083 150, 1080 165 Q1078 173, 1077 178" />
        <path d="M1140 50 Q1138 85, 1140 120 Q1142 140, 1139 155 Q1137 162, 1136 167" />

        {/* Horizontal streets (E-W) - slightly wobbly */}
        <path d="M400 80 Q500 78, 600 80 Q700 82, 800 80 Q900 78, 1000 80 Q1100 82, 1200 80" />
        <path d="M400 120 Q500 118, 600 120 Q700 122, 800 120 Q900 118, 1000 120 Q1100 122, 1200 120" />
        <path d="M400 160 Q500 158, 600 160 Q700 162, 800 160 Q900 158, 1000 160 Q1100 162, 1200 160" />
        <path d="M410 200 Q510 198, 610 200 Q710 202, 810 200 Q910 198, 1010 200 Q1110 202, 1200 200" />
        <path d="M420 240 Q520 238, 620 240 Q720 242, 820 240 Q920 238, 1020 240 Q1120 242, 1200 240" />
        <path d="M435 280 Q535 278, 635 280 Q735 282, 835 278 Q935 276, 1035 280 Q1135 282, 1200 280" />
      </g>

      {/* Golden Gate Park - broad horizontal band with tree-like marks */}
      <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6">
        {/* Park boundaries */}
        <path d="M400 55 Q500 53, 600 55 Q700 57, 800 55 Q900 53, 1000 55 Q1100 57, 1200 55" />
        <path d="M400 75 Q500 73, 600 75 Q700 77, 800 75 Q900 73, 1000 75 Q1100 77, 1200 75" />
        {/* Tree clusters - small organic marks */}
        <circle cx="450" cy="65" r="4" />
        <circle cx="520" cy="62" r="3.5" />
        <circle cx="590" cy="67" r="4" />
        <circle cx="660" cy="63" r="3" />
        <circle cx="740" cy="66" r="4.5" />
        <circle cx="810" cy="64" r="3.5" />
        <circle cx="890" cy="67" r="4" />
        <circle cx="960" cy="62" r="3" />
        <circle cx="1040" cy="66" r="4" />
        <circle cx="1110" cy="63" r="3.5" />
      </g>

      {/* Marin Headlands silhouette - top right, gentle hills */}
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4">
        <path d="M900 45 Q930 30, 960 20 Q990 12, 1020 18 Q1050 25, 1080 15 Q1110 5, 1140 10 Q1170 16, 1200 8" />
      </g>

      {/* Ocean Beach label area - subtle dots suggesting sand */}
      <g fill="currentColor" opacity="0.3">
        <circle cx="150" cy="395" r="1.5" />
        <circle cx="180" cy="388" r="1" />
        <circle cx="210" cy="380" r="1.5" />
        <circle cx="240" cy="373" r="1" />
        <circle cx="270" cy="365" r="1.5" />
        <circle cx="300" cy="358" r="1" />
        <circle cx="330" cy="350" r="1.5" />
        <circle cx="360" cy="343" r="1" />
        <circle cx="390" cy="335" r="1.5" />
      </g>
    </svg>
  );
}
