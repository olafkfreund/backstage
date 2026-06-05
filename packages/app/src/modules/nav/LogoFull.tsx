import { makeStyles } from '@material-ui/core';

const useStyles = makeStyles({
  svg: {
    width: 'auto',
    height: 32,
  },
  cloud: {
    fill: 'currentColor',
  },
  wave: {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 6,
    strokeLinecap: 'round',
  },
  text: {
    fill: 'currentColor',
    fontFamily:
      '"JetBrains Mono", "Fira Code", "SF Mono", Menlo, Consolas, monospace',
    fontWeight: 600,
    letterSpacing: '0.04em',
  },
});

export const LogoFull = () => {
  const classes = useStyles();

  return (
    <svg
      className={classes.svg}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 360 96"
      role="img"
      aria-label="Freundcloud"
    >
      <path
        className={classes.cloud}
        d="M28 46c-8 0-14 6-14 14s6 14 14 14h44c7 0 13-5 13-13 0-7-5-12-12-13-1-9-9-16-18-16-7 0-13 4-16 10-3-3-7-5-11-5-7 0-13 5-13 13z"
      />
      <path
        className={classes.wave}
        d="M8 80c8 0 8-8 16-8s8 8 16 8 8-8 16-8 8 8 16 8 8-8 16-8"
      />
      <text
        className={classes.text}
        x="112"
        y="60"
        fontSize="32"
      >
        freundcloud
      </text>
    </svg>
  );
};
