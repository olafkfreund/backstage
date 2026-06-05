import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { InfoCard } from '@backstage/core-components';
import { githubAuthApiRef, useApi } from '@backstage/core-plugin-api';
import CircularProgress from '@material-ui/core/CircularProgress';
import Link from '@material-ui/core/Link';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';

const GITHUB_USER = 'olafkfreund';
const SEARCH_URL =
  'https://api.github.com/search/issues?q=is:pr+is:open+author:' +
  GITHUB_USER +
  '+archived:false&sort=created&order=asc&per_page=20';
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

type ReviewState = 'approved' | 'changes_requested' | 'pending' | 'none';

interface GithubPullRequestRef {
  readonly url?: string;
}

interface GithubSearchItem {
  readonly id: number;
  readonly number: number;
  readonly title: string;
  readonly html_url: string;
  readonly created_at: string;
  readonly repository_url: string;
  readonly draft?: boolean;
  readonly pull_request?: GithubPullRequestRef;
}

interface GithubSearchResponse {
  readonly total_count: number;
  readonly incomplete_results: boolean;
  readonly items: ReadonlyArray<GithubSearchItem>;
}

interface GithubReview {
  readonly state: string;
  readonly submitted_at?: string;
}

interface PrRow {
  readonly id: number;
  readonly repo: string;
  readonly title: string;
  readonly url: string;
  readonly createdAt: Date;
  readonly reviewState: ReviewState;
  readonly isDraft: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isGithubSearchItem = (value: unknown): value is GithubSearchItem => {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'number' &&
    typeof value.number === 'number' &&
    typeof value.title === 'string' &&
    typeof value.html_url === 'string' &&
    typeof value.created_at === 'string' &&
    typeof value.repository_url === 'string'
  );
};

const isGithubSearchResponse = (
  value: unknown,
): value is GithubSearchResponse => {
  if (!isRecord(value)) return false;
  const items = value.items;
  if (!Array.isArray(items)) return false;
  return items.every(isGithubSearchItem);
};

const isGithubReviewArray = (value: unknown): value is GithubReview[] => {
  if (!Array.isArray(value)) return false;
  return value.every(
    entry => isRecord(entry) && typeof entry.state === 'string',
  );
};

const repoFromRepositoryUrl = (repositoryUrl: string): string => {
  // repositoryUrl looks like https://api.github.com/repos/<owner>/<repo>
  const marker = '/repos/';
  const idx = repositoryUrl.indexOf(marker);
  if (idx === -1) return repositoryUrl;
  return repositoryUrl.slice(idx + marker.length);
};

const formatRelative = (from: Date, to: Date = new Date()): string => {
  const deltaSeconds = Math.max(
    0,
    Math.floor((to.getTime() - from.getTime()) / 1000),
  );
  if (deltaSeconds < 60) return `${deltaSeconds}s ago`;
  const minutes = Math.floor(deltaSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
};

const reduceReviewStates = (reviews: GithubReview[]): ReviewState => {
  if (reviews.length === 0) return 'none';
  // Keep only the latest review per state ordering; GitHub returns chronologically.
  let hasApproved = false;
  let hasChangesRequested = false;
  let hasPending = false;
  for (const review of reviews) {
    const state = review.state.toUpperCase();
    if (state === 'APPROVED') hasApproved = true;
    else if (state === 'CHANGES_REQUESTED') hasChangesRequested = true;
    else if (state === 'PENDING' || state === 'COMMENTED') hasPending = true;
  }
  if (hasChangesRequested) return 'changes_requested';
  if (hasApproved) return 'approved';
  if (hasPending) return 'pending';
  return 'none';
};

const describeReviewState = (state: ReviewState, isDraft: boolean): string => {
  if (isDraft) return 'draft';
  switch (state) {
    case 'approved':
      return 'approved';
    case 'changes_requested':
      return 'changes requested';
    case 'pending':
      return 'review pending';
    case 'none':
    default:
      return 'awaiting review';
  }
};

const useStyles = makeStyles(theme => ({
  list: {
    maxHeight: 420,
    overflowY: 'auto',
    paddingTop: 0,
    paddingBottom: 0,
  },
  item: {
    paddingLeft: 0,
    paddingRight: 0,
  },
  secondary: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    color: theme.palette.text.secondary,
    fontSize: '0.8125rem',
  },
  repo: {
    fontWeight: 500,
    color: theme.palette.text.primary,
  },
  state: {
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
    fontSize: '0.6875rem',
  },
  stateApproved: {
    color: theme.palette.success.main,
  },
  stateChanges: {
    color: theme.palette.error.main,
  },
  statePending: {
    color: theme.palette.warning.main,
  },
  stateNeutral: {
    color: theme.palette.text.secondary,
  },
  centered: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  empty: {
    padding: theme.spacing(2, 0),
    color: theme.palette.text.secondary,
  },
  error: {
    padding: theme.spacing(2, 0),
    color: theme.palette.error.main,
  },
  link: {
    fontWeight: 500,
  },
}));

export const OrgOpenPrs: React.FC = () => {
  const classes = useStyles();
  const githubAuthApi = useApi(githubAuthApiRef);
  const [rows, setRows] = useState<ReadonlyArray<PrRow>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>(undefined);

  const fetchReviewState = useCallback(
    async (
      repo: string,
      prNumber: number,
      token: string,
      signal: AbortSignal,
    ): Promise<ReviewState> => {
      try {
        const response = await fetch(
          `https://api.github.com/repos/${repo}/pulls/${prNumber}/reviews?per_page=100`,
          {
            signal,
            headers: {
              Accept: 'application/vnd.github+json',
              Authorization: `Bearer ${token}`,
              'X-GitHub-Api-Version': '2022-11-28',
            },
          },
        );
        if (!response.ok) return 'none';
        const payload: unknown = await response.json();
        if (!isGithubReviewArray(payload)) return 'none';
        return reduceReviewStates(payload);
      } catch {
        return 'none';
      }
    },
    [],
  );

  const load = useCallback(
    async (signal: AbortSignal): Promise<void> => {
      setError(undefined);
      try {
        const token = await githubAuthApi.getAccessToken('repo');
        const response = await fetch(SEARCH_URL, {
          signal,
          headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${token}`,
            'X-GitHub-Api-Version': '2022-11-28',
          },
        });

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          throw new Error(
            `GitHub responded ${response.status} ${response.statusText}${
              text ? `: ${text.slice(0, 140)}` : ''
            }`,
          );
        }

        const payload: unknown = await response.json();
        if (!isGithubSearchResponse(payload)) {
          throw new Error('Unexpected response shape from GitHub');
        }

        const baseRows: PrRow[] = payload.items
          .filter(item => item.pull_request !== undefined)
          .map(item => ({
            id: item.id,
            repo: repoFromRepositoryUrl(item.repository_url),
            title: item.title,
            url: item.html_url,
            createdAt: new Date(item.created_at),
            reviewState: 'none' as ReviewState,
            isDraft: item.draft === true,
          }));

        const enriched = await Promise.all(
          baseRows.map(async row => {
            const prNumber = Number.parseInt(row.url.split('/').pop() ?? '0', 10);
            if (!Number.isFinite(prNumber) || prNumber <= 0) return row;
            const reviewState = await fetchReviewState(
              row.repo,
              prNumber,
              token,
              signal,
            );
            return { ...row, reviewState };
          }),
        );

        if (signal.aborted) return;
        setRows(enriched);
      } catch (err) {
        if (signal.aborted) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        const message =
          err instanceof Error ? err.message : 'Failed to load open PRs';
        setError(message);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [fetchReviewState, githubAuthApi],
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void load(controller.signal);

    const interval = window.setInterval(() => {
      const refreshController = new AbortController();
      void load(refreshController.signal);
    }, REFRESH_INTERVAL_MS);

    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [load]);

  const stateClassFor = useCallback(
    (state: ReviewState, isDraft: boolean): string => {
      if (isDraft) return classes.stateNeutral;
      switch (state) {
        case 'approved':
          return classes.stateApproved;
        case 'changes_requested':
          return classes.stateChanges;
        case 'pending':
          return classes.statePending;
        case 'none':
        default:
          return classes.stateNeutral;
      }
    },
    [classes],
  );

  const body = useMemo(() => {
    if (loading && rows.length === 0) {
      return (
        <div className={classes.centered}>
          <CircularProgress size={28} />
        </div>
      );
    }

    if (error) {
      return (
        <Typography variant="body2" className={classes.error}>
          {error}
        </Typography>
      );
    }

    if (rows.length === 0) {
      return (
        <Typography variant="body2" className={classes.empty}>
          No open PRs.
        </Typography>
      );
    }

    return (
      <List dense className={classes.list} disablePadding>
        {rows.map(row => {
          const stateLabel = describeReviewState(row.reviewState, row.isDraft);
          const stateClass = stateClassFor(row.reviewState, row.isDraft);
          return (
            <ListItem
              key={row.id}
              divider
              className={classes.item}
              disableGutters
            >
              <ListItemText
                disableTypography
                primary={
                  <Link
                    href={row.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    color="inherit"
                    underline="hover"
                    className={classes.link}
                  >
                    {row.title}
                  </Link>
                }
                secondary={
                  <span className={classes.secondary}>
                    <span className={classes.repo}>{row.repo}</span>
                    <span>·</span>
                    <span>{formatRelative(row.createdAt)}</span>
                    <span>·</span>
                    <span className={`${classes.state} ${stateClass}`}>
                      {stateLabel}
                    </span>
                  </span>
                }
              />
            </ListItem>
          );
        })}
      </List>
    );
  }, [classes, error, loading, rows, stateClassFor]);

  return <InfoCard title="Open PRs across all repos">{body}</InfoCard>;
};

export default OrgOpenPrs;
