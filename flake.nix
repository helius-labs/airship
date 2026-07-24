{
  description = "Helius Airship PNPM dev shell";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs, ... }:
    let
      system = "x86_64-linux"; # adjust if on macOS
      pkgs = import nixpkgs { inherit system; };
    in
    {
      # This is the key: devShells.<system>.default
      devShells = {
        "${system}" = {
          default = pkgs.mkShell {
            buildInputs = [
              pkgs.nodejs
              pkgs.pnpm
              pkgs.git
            ];

            shellHook = ''
              echo "Welcome to Helius Airship PNPM dev shell!"
              echo "Node version: $(node -v)"
              echo "PNPM version: $(pnpm -v)"
            '';
          };
        };
      };
    };
}
