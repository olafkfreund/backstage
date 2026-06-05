import React, { useCallback, useEffect, useState } from 'react';
import { InfoCard } from '@backstage/core-components';
import { githubAuthApiRef, useApi } from '@backstage/core-plugin-api';
import CircularProgress from '@material-ui/core/CircularProgress';
import Link from '@material-ui/core/Link';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import { makeStyles } from '@material-ui/core/styles';

const CARD_TITLE = 'PRs awaiting your review';
const REVIEWER_LOGIN = 'olafkfreund';
const SEARCH_QUERY = `is:pr is:open review-requested:${REVIEWER_LOGIN} archived:false`;
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

type PullRequestItem = {
  id: number;
  htmlUrl: string;
  title: string;
  repo: string;
  author: string;
  createdAt: string;
};

type GithubUser = {
  login?: unknown;
};

type GithubSearchItem = {
  id?: unknown;
  html_url?: unknown;
  title?: unknown;
  repository_url?: unknown;
  user?: unknown;
  created_at?: unknown;
};

type GithubSearchResponse = {
  items?: unknown;
  message?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const repoFromUrl = (repositoryUrl: string | undefined): string => {
  if (!repositoryUrl) return 'unknown';
  // repository_url looks like https://api.github.com/repos/<owner>/<repo>
  const marker = '/repos/';
  const idx = repositoryUrl.indexOf(marker);
  if (idx === -1) return 'unknown';
  return repositoryUrl.slice(idx + marker.length);
};

const parsePullRequest = (raw: unknown): PullRequestItem | undefined => {
  if (!isRecord(raw)) return undefined;
  const item = raw as GithubSearchItem;

  const id = asNumber(item.id);
  const htmlUrl = asString(item.html_url);
  const title = asString(item.title);
  const createdAt = asString(item.created_at);
  const repositoryUrl = asString(item.repository_url);

  if (id === undefined || !htmlUrl || !title || !createdAt) {
    return undefined;
  }

  const user = isRecord(item.user) ? (item.user as GithubUser) : undefined;
  const author = asString(user?.login) ?? 'unknown';

  return {
    id,
    htmlUrl,
    title,
    repo: repoFromUrl(repositoryUrl),
    author,
    createdAt,
  };
};

const formatRelative = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'unknown';
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));

  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth}mo ago`;
  const diffYear = Math.floor(diffDay / 365);
  return `${diffYear}y ago`;
};

const useStyles = makeStyles(theme => ({
  centered: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(3),
  },
  errorText: {
    color: theme.palette.error.main,
  },
  list: {
    maxHeight: 360,
    overflowY: 'auto',
    paddingTop: 0,
    paddingBottom: 0,
  },
  secondary: {
    color: theme.palette.text.secondary,
  },
  link: {
    display: 'block',
    width: '100%',
  },
}));

export const ReviewRequested: React.FC = () => {
  const classes = useStyles();
  const githubAuth = useApi(githubAuthApiRef);

  const [items, setItems] = useState<PullRequestItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>(undefined);

  const fetchPullRequests = useCallback(
    async (signal: AbortSignal): Promise<void> => {
      setLoading(true);
      setError(undefined);

      try {
        const token = await githubAuth.getAccessToken('repo');
        const url = `https://api.github.com/search/issues?q=${encodeURIComponent(
          SEARCH_QUERY,
        )}&sort=created&order=desc&per_page=30`;

        const response = await fetch(url, {
          signal,
          headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${token}`,
            'X-GitHub-Api-Version': '2022-11-28',
          },
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => undefined)) as
            | GithubSearchResponse
            | undefined;
          const message =
            asString(body?.message) ?? `GitHub API error: ${response.status}`;
          throw new Error(message);
        }

        const payload = (await response.json()) as GithubSearchResponse;
        const rawItems = Array.isArray(payload.items) ? payload.items : [];
        const parsed = rawItems
          .map(parsePullRequest)
          .filter((it): it is PullRequestItem => it !== undefined);

        if (!signal.aborted) {
          setItems(parsed);
        }
      } catch (e) {
        if (signal.aborted) return;
        const message = e instanceof Error ? e.message : 'Unknown error';
        if (message === 'The operation was aborted.' || message === 'AbortError') {
          return;
        }
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
    void fetchPullRequests(controller.signal);

    const interval = window.setInterval(() => {
      const refreshController = new AbortController();
      void fetchPullRequests(refreshController.signal);
    }, REFRESH_INTERVAL_MS);

    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [fetchPullRequests]);

  const renderBody = (): JSX.Element => {
    if (loading && items.length === 0) {
      return (
        <Box className={classes.centered}>
          <CircularProgress size={24} />
        </Box>
      );
    }

    if (error) {
      return (
        <Box className={classes.centered}>
          <Typography variant="body2" className={classes.errorText}>
            Failed to load: {error}
          </Typography>
        </Box>
      );
    }

    if (items.length === 0) {
      return (
        <Box className={classes.centered}>
          <Typography variant="body2" className={classes.secondary}>
            No items
          </Typography>
        </Box>
      );
    }

    return (
      <List dense className={classes.list}>
        {items.map(pr => {
          const primary = `${pr.repo}: ${pr.title}`;
          const secondary = `${formatRelative(pr.createdAt)} · by ${pr.author}`;
          return (
            <ListItem key={pr.id} button component="div" disableGutters>
              <Link
                href={pr.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                color="inherit"
                underline="none"
                className={classes.link}
              >
                <ListItemText
                  primary={primary}
                  primaryTypographyProps={{ variant: 'body2' }}
                  secondary={secondary}
                  secondaryTypographyProps={{
                    variant: 'caption',
                    className: classes.secondary,
                  }}
                />
              </Link>
            </ListItem>
          );
        })}
      </List>
    );
  };

  return <InfoCard title={CARD_TITLE}>{renderBody()}</InfoCard>;
};

export default ReviewRequested;
