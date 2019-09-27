// NOTE: our routing needs are so simple, we roll our own
// to avoid dependencies on react-router, to stay leaner.

import React, { Children, useEffect } from 'react';
import PropTypes from 'prop-types';

const RouterContext = React.createContext({});

export const Router = ({ children }) => {
  const [path, setPath] = React.useState();
  const [search, setSearch] = React.useState();

  useEffect(() => {
    const onPopState = () => {
      const { location } = document;
      setPath(location.pathname);
      setSearch(location.search);
    };
    window.addEventListener('popstate', onPopState);
    onPopState();
    return () => window.removeEventListener('popstate', onPopState);
  }, [])

  const onPush = (nextPath) => {
    if (nextPath !== path) {
      if (nextPath.startsWith('http')) {
        window.location = nextPath;
      } else {
        window.history.pushState(
          undefined,
          undefined,
          `${nextPath}${search || ''}`,
        );
        setPath(nextPath);
        window.scrollTo(0, 0);
      }
    }
  };

  return (
    <RouterContext.Provider value={{ path, search, push: onPush }}>
      {children}
    </RouterContext.Provider>
  );
}

Router.propTypes = {
  children: PropTypes.node.isRequired,
};

export const Routes = ({ children, notFoundRedirect }) => (
  <RouterContext.Consumer>
    {({ path: currentPath }) => {
      const preHash = currentPath && currentPath.split('#')[0];
      let found;
      Children.forEach(children, (child) => {
        if (found || !child) return;
        const { path, exact } = child.props;
        const prefix = path ? path.split(':')[0] : '';
        if (
          !found &&
          currentPath &&
          ((exact && preHash === path) ||
            (!exact && preHash.startsWith(prefix)))
        ) {
          found = child;
        }
      });
      if (currentPath && !found) {
        window.history.replace(notFoundRedirect);
      }
      return found;
    }}
  </RouterContext.Consumer>
);

Routes.propTypes = {
  children: PropTypes.node.isRequired,
  notFoundRedirect: PropTypes.string.isRequired,
};

export const Route = ({ component: Comp, exact, path, redirect }) => (
  <RouterContext.Consumer>
    {({ path: currentPath }) => {
      const preHash = currentPath.split('#')[0];
      const prefix = !exact && path.split(':')[0];
      if (
        currentPath &&
        ((exact && preHash === path) || (!exact && preHash.startsWith(prefix)))
      ) {
        if (redirect) {
          window.history.replace(redirect);
        } else if (Comp) {
          const props = {};
          if (!exact) {
            const propName = path.split(':')[1];
            props[propName] = preHash.slice(prefix.length);
          }
          return <Comp {...props} />;
        } else {
          console.error('Route missing component or redirect');
        }
      }
      return null;
    }}
  </RouterContext.Consumer>
);

Route.propTypes = {
  component: PropTypes.func,
  path: PropTypes.string.isRequired,
  redirect: PropTypes.string,
};

Route.defaultProps = {
  component: undefined,
  redirect: undefined,
};

export const Watcher = ({ children }) => (
  <RouterContext.Consumer>
    {({ path }) => children(path)}
  </RouterContext.Consumer>
);

Watcher.propTypes = {
  children: PropTypes.func.isRequired,
};
