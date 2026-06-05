import { useCallback, useEffect, useMemo, useState } from 'react';
import { InfoCard } from '@backstage/core-components';
import { githubAuthApiRef, useApi } from '@backstage/core-plugin-api';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Link from '@material-ui/core/Link';
import CircularProgress from '@material-ui/core/CircularProgress';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import Chip from '@material-ui/core/Chip';
import { makeStyles } from '@material-ui/core/styles';

const CARD_TITLE = 'Open issues across repos';
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const SEARCH_URL = `https://api.github.com/search/issues?q=${encodeURIComponent(
  'is:issue is:open user:olafkfreund archived:false',
)}&sort=created&order=asc&per_page=20`;

type GithubLabel = {
  id?: number;
  name?: string;
};

type GithubIssueItem = {
  id: number;
  number: number;
  title: string;
  html_url: string;
  created_at: string;
  repository_url: string;
  labels?: GithubLabel[];
};

type GithubSearchResponse = {
  total_count: number;
  incomplete_results: boolean;
  items: GithubIssueItem[];
};

const isGithubSearchResponse = (
  value: unknown,
): value is GithubSearchResponse => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as { items?: unknown };
  return Array.isArray(candidate.items);
};

const repoNameFromUrl = (repoUrl: string): string => {
  // repository_url looks like https://api.github.com/repos/<owner>/<repo>
  const parts = repoUrl.split('/');
  if (parts.length < 2) {
    return repoUrl;
  }
  return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
};

const formatRelative = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return 'unknown';
  }
  const diffMs = Date.now() - then;
  if (diffMs < 0) {
    return 'just now';
  }
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days}d ago`;
  }
  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months}mo ago`;
  }
  const years = Math.floor(days / 365);
  return `${years}y ago`;
};

const useStyles = makeStyles(theme => ({
  centered: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(4),
  },
  scroll: {
    maxHeight: 360,
    overflowY: 'auto',
  },
  errorText: {
    color: theme.palette.error.main,
  },
  secondaryLine: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    flexWrap: 'wrap',
  },
  repoLabel: {
    fontFamily: 'monospace',
    fontSize: '0.8rem',
    color: theme.palette.text.secondary,
  },
  metaChip: {
    height: 20,
  },
}));

export const OpenIssues: React.FC = () => {
  const classes = useStyles();
  const githubAuthApi = useApi(githubAuthApiRef);

  const [items, setItems] = useState<GithubIssueItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      const token = await githubAuthApi.getAccessToken('repo');
      const response = await fetch(SEARCH_URL, {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });

      if (!response.ok) {
        throw new Error(
          `GitHub API responded with ${response.status} ${response.statusText}`,
        );
      }

      const payload: unknown = await response.json();
      if (!isGithubSearchResponse(payload)) {
        throw new Error('Unexpected response shape from GitHub search API');
      }

      setItems(payload.items);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load issues';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [githubAuthApi]);

  useEffect(() => {
    let cancelled = false;

    const run = async (): Promise<void> => {
      if (cancelled) {
        return;
      }
      await load();
    };

    void run();
    const interval = window.setInterval(() => {
      void run();
    }, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [load]);

  const body = useMemo(() => {
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
            {error}
          </Typography>
        </Box>
      );
    }

    if (items.length === 0) {
      return (
        <Box className={classes.centered}>
          <Typography variant="body2" color="textSecondary">
            No items
          </Typography>
        </Box>
      );
    }

    return (
      <List dense className={classes.scroll}>
        {items.map(issue => {
          const repo = repoNameFromUrl(issue.repository_url);
          const age = formatRelative(issue.created_at);
          const labelCount = issue.labels?.length ?? 0;
          return (
            <ListItem
              key={issue.id}
              button
              component={Link}
              href={issue.html_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ListItemText
                primary={
                  <Typography variant="body2" noWrap>
                    {issue.title}
                  </Typography>
                }
                secondary={
                  <span className={classes.secondaryLine}>
                    <span className={classes.repoLabel}>{repo}</span>
                    <Chip
                      size="small"
                      label={age}
                      className={classes.metaChip}
                    />
                    <Chip
                      size="small"
                      label={`${labelCount} label${labelCount === 1 ? '' : 's'}`}
                      className={classes.metaChip}
                    />
                  </span>
                }
                secondaryTypographyProps={{ component: 'div' }}
              />
            </ListItem>
          );
        })}
      </List>
    );
  }, [classes, error, items, loading]);

  return <InfoCard title={CARD_TITLE}>{body}</InfoCard>;
};

export default OpenIssues;
