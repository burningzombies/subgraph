# Burning Zombies Subgraph

An open-source subgraph index for Burning Zombies, powered by Avalanche.

## Schemas

### Collection

It stores the collection info.

### Zombie

Stores token info.

### Trait

It stores trait info assigned to tokens.

### TokenHistory

It stores the token's events.

## Example Queries

### Querying The Most Valuable Ten Zombies

```graphql
{
  zombies (first: 10, orderBy: score, orderDirection: desc) {
    id
    name
    owner
    imageURI
    score
  }
}
```

### Querying A Zombie With Trading History

```graphql
{
  zombies (where:{ name: "Yelena" }) {
    id
    name
    owner
    imageURI
    score
    history {
      eventType
      date
      from
      to
    }
  }
}
```

## Development

```shell
npm run codegen       # Generates AssemblyScript types
npm run build         # Build subgraph
npm run deploy        # Deploy to network
npm run create-local  # Create local subgraph (check the host and port in the package.json)
npm run remove-local  # Remove local subgraph (check the host and port in the package.json)
npm run deploy-local  # Deploy local subgraph (check the host and port  in the package.json)
```
