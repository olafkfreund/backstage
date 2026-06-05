import { useCallback, useEffect, useState } from 'react';
import { InfoCard } from '@backstage/core-components';
import { githubAuthApiRef, useApi } from '@backstage/core-plugin-api';
import { useSignal } from '@backstage/plugin-signals-react';
import Box from '@material-ui/core/Box';
import CircularProgress from '@material-ui/core/CircularProgress';
import Link from '@material-ui/core/Link';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ITEMS = 10;
const GITHUB_USER = 'olafkfreund';

type CommitRow = {
  repo: string;
  sha: string;
  shortSha: string;
  message: string;
  url: string;
  date: Date;
};

type GithubPushPayload = {
  // GitHub stopped including the commits[] array in /users/X/events PushEvent
  // payloads — only `head` (the resulting head SHA) and `ref` come through
  // now. We follow up with /repos/X/commits/{head} to fetch the message.
  head?: unknown;
  ref?: unknown;
};

type PushHead = {
  repo: string;
  sha: string;
  ref: string;
  date: Date;
};

type GithubRepo = {
  name?: unknown;
};

type GithubEvent = {
  type?: unknown;
  created_at?: unknown;
  repo?: unknown;
  payload?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isString = (value: unknown): value is string => typeof value === 'string';

const parseEvent = (raw: unknown): GithubEvent | null =>
  isRecord(raw) ? (raw as GithubEvent) : null;

const formatRelative = (date: Date, now: Date = new Date()): string => {
  const diffSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  }
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) {
    return `${diffWeeks}w ago`;
  }
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `${diffMonths}mo ago`;
  }
  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears}y ago`;
};

const firstLine = (message: string): string => {
  const newlineIdx = message.indexOf('\n');
  return newlineIdx === -1 ? message : message.slice(0, newlineIdx);
};

const extractPushHeads = (events: unknown, since: Date): PushHead[] => {
  if (!Array.isArray(events)) {
    return [];
  }

  const heads: PushHead[] = [];

  for (const rawEvent of events) {
    const event = parseEvent(rawEvent);
    if (!event || event.type !== 'PushEvent') {
      continue;
    }

    const createdAt = isString(event.created_at) ? new Date(event.created_at) : null;
    if (!createdAt || Number.isNaN(createdAt.getTime()) || createdAt < since) {
      continue;
    }

    const repoObj = isRecord(event.repo) ? (event.repo as GithubRepo) : null;
    const repoName = repoObj && isString(repoObj.name) ? repoObj.name : null;
    if (!repoName) {
      continue;
    }

    const payload = isRecord(event.payload) ? (event.payload as GithubPushPayload) : null;
    const sha = payload && isString(payload.head) ? payload.head : null;
    const ref = payload && isString(payload.ref) ? payload.ref : '';
    if (!sha) {
      continue;
    }

    heads.push({ repo: repoName, sha, ref, date: createdAt });
  }

  heads.sort((a, b) => b.date.getTime() - a.date.getTime());
  return heads.slice(0, MAX_ITEMS);
};

const fetchCommitMessage = async (
  head: PushHead,
  token: string,
  signal: AbortSignal,
): Promise<CommitRow | null> => {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${head.repo}/commits/${head.sha}`,
      {
        signal,
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );
    if (!response.ok) {
      return null;
    }
    const data: unknown = await response.json();
    const obj = isRecord(data) ? data : null;
    const commit = obj && isRecord(obj.commit) ? (obj.commit as Record<string, unknown>) : null;
    const message = commit && isString(commit.message) ? commit.message : null;
    if (!message) {
      return null;
    }
    return {
      repo: head.repo,
      sha: head.sha,
      shortSha: head.sha.slice(0, 7),
      message: firstLine(message).trim() || '(no message)',
      url: `https://github.com/${head.repo}/commit/${head.sha}`,
      date: head.date,
    };
  } catch {
    return null;
  }
};

const useStyles = makeStyles(theme => ({
  centered: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(3),
  },
  list: {
    maxHeight: 360,
    overflowY: 'auto',
    paddingTop: 0,
    paddingBottom: 0,
  },
  listItem: {
    alignItems: 'flex-start',
  },
  primaryRow: {
    display: 'flex',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
  },
  repo: {
    fontWeight: 600,
  },
  sha: {
    fontFamily: 'monospace',
    color: theme.palette.text.secondary,
    fontSize: '0.85em',
  },
  age: {
    marginLeft: 'auto',
    color: theme.palette.text.hint,
    fontSize: '0.85em',
    whiteSpace: 'nowrap',
  },
  message: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  error: {
    color: theme.palette.error.main,
  },
}));

export const RecentActivity: React.FC = () => {
  const classes = useStyles();
  const githubAuth = useApi(githubAuthApiRef);

  const [rows, setRows] = useState<CommitRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCommits = useCallback(
    async (signal: AbortSignal): Promise<void> => {
      try {
        const token = await githubAuth.getAccessToken('repo');
        const response = await fetch(
          `https://api.github.com/users/${GITHUB_USER}/events?per_page=30`,
          {
            signal,
            headers: {
              Accept: 'application/vnd.github+json',
              Authorization: `Bearer ${token}`,
              'X-GitHub-Api-Version': '2022-11-28',
            },
          },
        );

        if (!response.ok) {
          throw new Error(`GitHub API ${response.status}: ${response.statusText}`);
        }

        const data: unknown = await response.json();
        const since = new Date(Date.now() - LOOKBACK_MS);
        const heads = extractPushHeads(data, since);

        // GitHub's /users/X/events PushEvent payloads no longer include
        // the commits[] array — only `head`. Follow up per-PushEvent with
        // /repos/X/commits/{head} to pull the commit message. Fetches run
        // in parallel; failures fall through to a null row that's filtered.
        const settled = await Promise.all(
          heads.map(h => fetchCommitMessage(h, token, signal)),
        );
        const extracted = settled.filter((r): r is CommitRow => r !== null);

        if (!signal.aborted) {
          setRows(extracted);
          setError(null);
        }
      } catch (err) {
        if (signal.aborted) {
          return;
        }
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    },
    [githubAuth],
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchCommits(controller.signal);

    const intervalId = window.setInterval(() => {
      const refreshController = new AbortController();
      void fetchCommits(refreshController.signal);
    }, REFRESH_INTERVAL_MS);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [fetchCommits]);

  // Real-time refresh: when the signals bridge re-broadcasts a github
  // event onto the `github:activity` channel, re-fetch immediately.
  // The 5-min poll above remains as a fallback for clients that lose
  // signals connectivity. isSignalsAvailable is false in environments
  // without the signals backend wired — silent no-op there.
  const { lastSignal } = useSignal('github:activity');
  useEffect(() => {
    if (!lastSignal) {
      return undefined;
    }
    const refreshController = new AbortController();
    void fetchCommits(refreshController.signal);
    return () => refreshController.abort();
  }, [lastSignal, fetchCommits]);

  const renderBody = (): React.ReactNode => {
    if (loading && rows.length === 0) {
      return (
        <Box className={classes.centered}>
          <CircularProgress size={24} />
        </Box>
      );
    }

    if (error && rows.length === 0) {
      return (
        <Box className={classes.centered}>
          <Typography variant="body2" className={classes.error}>
            Failed to load commits: {error}
          </Typography>
        </Box>
      );
    }

    if (rows.length === 0) {
      return (
        <Box className={classes.centered}>
          <Typography variant="body2" color="textSecondary">
            No items
          </Typography>
        </Box>
      );
    }

    return (
      <List dense className={classes.list}>
        {rows.map(row => (
          <ListItem
            key={`${row.repo}-${row.sha}`}
            divider
            className={classes.listItem}
            component={Link}
            href={row.url}
            target="_blank"
            rel="noopener noreferrer"
            button
          >
            <ListItemText
              disableTypography
              primary={
                <Box className={classes.primaryRow}>
                  <Typography variant="body2" className={classes.repo}>
                    {row.repo}
                  </Typography>
                  <Typography variant="body2" className={classes.sha}>
                    {row.shortSha}
                  </Typography>
                  <Typography
                    variant="caption"
                    className={classes.age}
                    title={row.date.toISOString()}
                  >
                    {formatRelative(row.date)}
                  </Typography>
                </Box>
              }
              secondary={
                <Typography
                  variant="body2"
                  color="textSecondary"
                  className={classes.message}
                  title={row.message}
                >
                  {row.message}
                </Typography>
              }
            />
          </ListItem>
        ))}
      </List>
    );
  };

  return <InfoCard title="Recent commits across repos">{renderBody()}</InfoCard>;
};

export default RecentActivity;
