{
  description = "AI-powered commit message generator";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        packages.default = pkgs.stdenv.mkDerivation {
          pname = "aicommits";
          version = "1.2.0";
          
          src = ./.;
          
          nativeBuildInputs = with pkgs; [
            bun
            git
          ];
          
          buildInputs = with pkgs; [
            bun
            git
          ];
          
          installPhase = ''
            mkdir -p $out/bin $out/share/aicommits
            
            # Copy source files
            cp -r src $out/share/aicommits/
            cp index.ts $out/share/aicommits/
            cp package.json $out/share/aicommits/
            cp tsconfig.json $out/share/aicommits/
            
            # Create wrapper script that installs deps on first run
            cat > $out/bin/aicommit << EOF
#!/usr/bin/env bash
export PATH="${pkgs.git}/bin:\$PATH"
INSTALL_DIR="\$HOME/.cache/aicommits"
ORIGINAL_PWD="\$PWD"

# Create cache directory if it doesn't exist
mkdir -p "\$INSTALL_DIR"

# Copy files if not already there or if source is newer
if [ ! -d "\$INSTALL_DIR/node_modules" ] || [ "$out/share/aicommits" -nt "\$INSTALL_DIR" ]; then
  echo "Setting up aicommits..."
  cp -r $out/share/aicommits/* "\$INSTALL_DIR/"
  cd "\$INSTALL_DIR"
  ${pkgs.bun}/bin/bun install
fi

# Run from original directory but with deps from cache
cd "\$ORIGINAL_PWD"
exec env NODE_PATH="\$INSTALL_DIR/node_modules" ${pkgs.bun}/bin/bun run "\$INSTALL_DIR/index.ts" "\$@"
EOF
            chmod +x $out/bin/aicommit
          '';
          
          meta = with pkgs.lib; {
            description = "AI-powered commit message generator";
            homepage = "https://github.com/ghaerdi/aicommits";
            license = licenses.mit;
            maintainers = [ ];
            platforms = platforms.unix;
          };
        };
        
        apps.default = {
          type = "app";
          program = "${self.packages.${system}.default}/bin/aicommit";
        };
        
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            bun
            git
            nodejs
          ];
        };
      }) // {
        # Home Manager module
        homeManagerModules.default = { config, lib, pkgs, ... }: {
          options.programs.aicommits = {
            enable = lib.mkEnableOption "aicommits";
            package = lib.mkOption {
              type = lib.types.package;
              default = self.packages.${pkgs.system}.default;
              description = "The aicommits package to use";
            };
          };
          
          config = lib.mkIf config.programs.aicommits.enable {
            home.packages = [ config.programs.aicommits.package ];
          };
        };
      };
}
