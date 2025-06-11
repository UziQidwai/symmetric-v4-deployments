# symmetric-v4-deployments

Steps to run. Tested using Node v20.x

Clone repo with --recursive flag since the repo includes the Symmetric-v4-monorepo contract repo.

```
git clone --recursive git@github.com:centfinance/symmetric-v4-deployments.git
```

Install dependencies.

```
npm install
```

Create a .env file, remembering to then edit the file with your private key.
```
cp .env.example .env
```

Setup symbolic links to allow us to use the Balancer package but mapping back to the Symmetric-v4-monorepo.

```
./setup-symlinks.sh
```

Build the contract assets.

```
npx hardhat clean
npm run compile
```

Deploy to Moksha

```
npm run deploy:moksha
```